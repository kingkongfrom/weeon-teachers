"use client";

import {
  Fragment,
  startTransition,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { AnimatePresence } from "motion/react";
import {
  Check,
  ChevronDown,
  Download,
  Loader2,
  Lock,
  Maximize2,
  Minimize2,
  Minus,
  Plus,
  Printer,
  Search,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLiveT } from "@/lib/i18n/client";
import { hubToneSegment, SEGMENT_TRACK } from "@/lib/dashboard/tones";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog } from "@/components/ui/dialog";
import { Dropdown } from "@/components/ui/dropdown";
import { EducationalSupportBadgeButton } from "@/components/educational-supports/support-badge-button";
import { EducationalSupportWorkflowDialog } from "@/components/educational-supports/support-workflow-dialog";
import { SubmitReport } from "@/components/grades/submit-report";
import { RubroHeaderCell } from "@/components/grades/rubro-header-cell";
import { RubroTotalCell, formatPoints, tonePillClass } from "@/components/grades/score-cells";
import { blockBucket, moveItem, orderColumnsByBlocks } from "@/lib/dashboard/grade-order";
import type {
  ClassEducationalSupportFlags,
  EducationalSupport,
} from "@/lib/educational-supports/model";
import { supportActionPending } from "@/lib/educational-supports/model";
import {
  fetchClassEducationalSupportFlags,
  fetchStudentEducationalSupports,
} from "@/lib/teachers/educational-support-actions";
import {
  addExamColumns,
  closeExamColumn,
  createRubro,
  deleteRubro,
  fetchSubjectExams,
  removeExamColumn,
  reorderGradebook,
  saveGrade,
  updateExamColumn,
  updateRubro,
} from "@/lib/teachers/exams-actions";
import type { AssignmentKind, ExamColumn, GradeRubro } from "@/lib/dashboard/exams";
import type { ClassOption } from "@/lib/dashboard/gradebook";
import type { TeacherStudent } from "@/lib/dashboard/grupos";
import {
  canStillPass,
  classStats,
  displayPercent,
  finalScore,
  type FinalScore,
} from "@/lib/dashboard/scoreboard";
import { totalPeso } from "@/lib/dashboard/grade-weights";
import { ScoreboardSummary } from "@/components/grades/scoreboard-summary";
import { ScoreboardStudentList } from "@/components/grades/scoreboard-student-list";
import { GradebookToolbar } from "@/components/grades/gradebook-toolbar";
import { GradingSheet } from "@/components/grades/grading-sheet";
import { RubricDialog } from "@/components/grades/rubric-dialog";
const PASS = 70;

/** Display order of the header groups: each type forms one contiguous group. */
const KIND_ORDER: AssignmentKind[] = [
  "classwork",
  "homework",
  "project",
  "exam",
  "quiz",
];

/** Column density. Each step widens the columns and lengthens the labels:
 * compact → `TRAB 1`, cozy → `Trabajo 1`, expanded → `Trabajo en clase 1`. */
type Density = "compact" | "cozy" | "expanded";
const DENSITY_ORDER: Density[] = ["compact", "cozy", "expanded"];

/** Calificaciones module accent (purple tone) for text-level highlights. */
// #5b21b6 instead of #7c3aed: the lighter violet failed WCAG AA (4.5:1) on the
// muted table surface at 9 px, which the gradebook a11y test catches.
const ACCENT_TEXT = "text-[#5b21b6] dark:text-[#c4b5fd]";

/** Upper bound for a single bulk "Agregar columna" submission. */
const MAX_NEW_COLUMNS = 20;

/**
 * Column type and auto-title noun are derived from the rubro name, not chosen by
 * the teacher. The rubro is the real grouping ("Tareas 30%"); asking for a type
 * again was redundant, so a column created under "Tareas" is a Tarea.
 *
 * Matching is accent- and case-insensitive and falls back to `classwork`, which
 * is also what an unknown/custom rubro should produce.
 */
function kindForRubro(rubroName: string): AssignmentKind {
  const name = rubroName
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (/\bexamen/.test(name)) return "exam";
  if (/\bprueba|\bquiz/.test(name)) return "quiz";
  if (/\bproyecto/.test(name)) return "project";
  if (/\btarea/.test(name)) return "homework";
  return "classwork";
}

/**
 * Column lock/delete visibility.
 *
 * The icons are visible by default, so any engine that ignores the media query
 * (or cannot parse it) still shows them — Safari included. Only a device that
 * reports `hover: hover` AND `pointer: fine` (a real mouse) hides them until
 * hover/focus. iPadOS Safari reports `hover: hover` for trackpad and Pencil
 * but never `pointer: fine`, so on iPad the icons stay visible.
 */
const COLUMN_ACTIONS_VISIBILITY =
  "opacity-100 [@media(hover:hover)_and_(pointer:fine)]:opacity-0 [@media(hover:hover)_and_(pointer:fine)]:group-hover/col:opacity-100 [@media(hover:hover)_and_(pointer:fine)]:group-focus-within/col:opacity-100 focus-within:opacity-100";

function pctOf(mark: number | null | undefined, max: number): number | null {
  if (mark == null || !max || max <= 0) return null;
  return Math.round((mark / max) * 100);
}

function columnMaxPoints(column: ExamColumn): number {
  if (column.points != null && column.points > 0) return column.points;
  return 100;
}

function cellMax(column: ExamColumn, studentId: string): number {
  const grade = column.grades[studentId];
  return grade?.maxMarks || columnMaxPoints(column);
}

function columnPct(column: ExamColumn, studentId: string): number | null {
  const grade = column.grades[studentId];
  if (!grade) return null;
  return pctOf(grade.mark, cellMax(column, studentId));
}


/* Grade tints — the same palette the marketing site shows for the gradebook
   (see weeon-marketing/docs/design-tokens.md). Solid enough to read as pills. */
const TINT_PASS = "bg-[#abe3dc] text-[#0f4c47] dark:bg-[#0f2f2c] dark:text-[#6ee7d7]";
const TINT_WARN = "bg-[#fdeecd] text-[#92400e] dark:bg-[#3a2a12] dark:text-[#fde68a]";
const TINT_FAIL = "bg-[#fbdee7] text-[#9f1239] dark:bg-[#3a1622] dark:text-[#fda4af]";

function tintFor(pct: number | null): string {
  if (pct == null) return "";
  if (pct >= PASS) return TINT_PASS;
  if (pct >= 50) return TINT_WARN;
  return TINT_FAIL;
}

/**
 * A block of consecutive columns. `rubroId === null` is the "Sin rubro"
 * bucket. The same rubro may appear in more than one block (a 100 % rubric
 * legitimately repeats a category), which is why the block key carries an
 * `ordinal` — React keys and drag keys are unique per block, not per rubro.
 */
type RubroGroup = {
  key: string;
  ordinal: number;
  rubroId: string | null;
  name: string | null;
  peso: number | null;
  columns: ExamColumn[];
};

/** Consecutive columns sharing the same rubro become one weighted header. */
function buildRubroGroups(
  columns: ExamColumn[],
  rubros: GradeRubro[],
): RubroGroup[] {
  const byId = new Map(rubros.map((rubro) => [rubro.id, rubro]));
  const groups: RubroGroup[] = [];
  for (const column of columns) {
    const rubro = column.rubroId ? byId.get(column.rubroId) : undefined;
    const bucket = blockBucket(column.rubroId);
    const last = groups[groups.length - 1];
    if (last && last.rubroId === column.rubroId) {
      last.columns.push(column);
    } else {
      const ordinal = groups.filter((group) => blockBucket(group.rubroId) === bucket).length;
      groups.push({
        key: `${bucket}#${ordinal}`,
        ordinal,
        rubroId: column.rubroId,
        name: rubro?.name ?? null,
        peso: rubro?.peso ?? null,
        columns: [column],
      });
    }
  }
  return groups;
}

function studentName(student: TeacherStudent): string {
  return `${student.lastName} ${student.firstName}`.trim();
}

/** The new Grades workspace: a sticky spreadsheet matrix with inline editing,
 * keyboard navigation, live summaries, and a FINAL average. Replaces the old
 * react-data-grid gradebook. */
export function GradebookWorkspace({
  classId,
  groupName,
  students,
  classContext,
  initialSubjectId,
  initialExams,
  initialRubros = [],
  supportFlags = {},
}: {
  classId: string;
  groupName: string;
  students: TeacherStudent[];
  classContext: ClassOption;
  initialSubjectId: string | null;
  initialExams: ExamColumn[];
  initialRubros?: GradeRubro[];
  supportFlags?: ClassEducationalSupportFlags;
}) {
  const t = useLiveT();
  const w = t.gradebook.workspace;
  const copy = w.rubros;
  const sb = w.scoreboard;
  const [subjectId, setSubjectId] = useState(initialSubjectId);
  const [exams, setExams] = useState<ExamColumn[]>(initialExams);
  const [rubros, setRubros] = useState<GradeRubro[]>(initialRubros);
  const [rubricMode, setRubricMode] = useState<"wizard" | "edit" | null>(null);
  // Archived rubros stay out of every default: they cannot receive columns.
  const activeRubros = rubros.filter((rubro) => !rubro.archived);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [density, setDensity] = useState<Density>("cozy");
  const dense = density === "compact";
  // Scoreboard view controls. They only re-order/filter rows; the numbers never
  // depend on them.
  type SortBy = "name" | "finalDesc" | "finalAsc";
  const [sortBy, setSortBy] = useState<SortBy>("name");
  const [onlyPending, setOnlyPending] = useState(false);
  const [onlyAtRisk, setOnlyAtRisk] = useState(false);
  /**
   * Marks are entered as points; this decides how they *read*. `points` keeps
   * the raw mark (`8`), `percent` shows the grade it produces (`80%`) without
   * changing the column's max. A display mode only — never a data change.
   */
  const [markView, setMarkView] = useState<"points" | "percent">("points");
  /**
   * Card view for narrow screens. It follows **orientation**, not width alone:
   * an iPad in portrait (768 px wide) gets the cards, and the same iPad turned
   * to landscape gets the full matrix with grade entry. Phones in landscape are
   * also wide (844 px) so they get the matrix too. The switch lets a teacher
   * override on those screens; it is hidden in landscape where the matrix wins.
   */
  const [phoneView, setPhoneView] = useState<"cards" | "grid">("cards");
  const showCards = phoneView === "cards";
  /**
   * Phone grading: tapping a card opens that student's columns in a sheet. The
   * matrix is unworkable at 390 px, and navigating to the transcript to grade
   * was a detour — teachers asked for entry on the phone.
   */
  const [gradingStudentId, setGradingStudentId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [closeTarget, setCloseTarget] = useState<ExamColumn | null>(null);
  const [closing, setClosing] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ExamColumn | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [localFlags, setLocalFlags] = useState(supportFlags);
  // Rubro blocks, in the teacher's order. `null` is the "Sin rubro" bucket.
  // Rebuilt from the saved rubric on every reload; a drag edits it in place.
  const [blockOrder, setBlockOrder] = useState<string[] | null>(null);
  const [rubroBusy, setRubroBusy] = useState<string | null>(null);
  /**
   * Header field to open for editing without a click — used right after
   * "Nuevo rubro" so the teacher types the name instead of hunting a hidden
   * input. The header clears it once it has started editing.
   */
  const [editRubroId, setEditRubroId] = useState<{
    id: string;
    field: "name" | "peso";
  } | null>(null);
  const [rubroDeleteTarget, setRubroDeleteTarget] = useState<GradeRubro | null>(null);
  /** Block bucket currently being dragged (`null` = no drag in progress). */
  const [draggingBlock, setDraggingBlock] = useState<string | null>(null);
  const draggingRef = useRef<{
    id: string;
    key: string;
    startX: number;
    startY: number;
    active: boolean;
  } | null>(null);
  const [reviewStudent, setReviewStudent] = useState<{
    id: string;
    name: string;
    supports: EducationalSupport[];
  } | null>(null);

  useEffect(() => {
    setLocalFlags(supportFlags);
  }, [supportFlags]);

  useEffect(() => {
    void fetchClassEducationalSupportFlags({ classId, subjectId }).then((res) => {
      if (res.ok) setLocalFlags(res.flags);
    });
  }, [classId, subjectId]);

  // First open after the rubric migration (or a brand-new subject with columns):
  // invite the teacher to define the weights once. Skipping is remembered per
  // user+subject, and the "Crear rubros" card is the way back.
  useEffect(() => {
    if (!subjectId || loading || rubros.length > 0 || exams.length === 0) return;
    try {
      if (
        window.localStorage.getItem(`weeon:rubro-skip:${classId}:${subjectId}`) === "1"
      ) {
        return;
      }
    } catch {
      // Storage unavailable; still show the wizard.
    }
    const timer = window.setTimeout(() => setRubricMode("wizard"), 0);
    return () => window.clearTimeout(timer);
  }, [classId, subjectId, loading, rubros.length, exams.length]);

  async function openSupportReview(student: TeacherStudent) {
    const res = await fetchStudentEducationalSupports(student.id, { subjectId });
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setReviewStudent({
      id: student.id,
      name: studentName(student),
      supports: res.supports,
    });
  }

  function patchSupportFlags(
    studentId: string,
    patch: Partial<Pick<ClassEducationalSupportFlags[string], "needsReview" | "needsPeriodRegistration">>,
  ) {
    setLocalFlags((prev) => {
      const current = prev[studentId];
      if (!current) return prev;
      return {
        ...prev,
        [studentId]: { ...current, ...patch },
      };
    });
  }

  const subject = classContext.subjects.find((s) => s.id === subjectId) ?? null;
  const subjectName = subject?.name ?? (classContext.subjects.length <= 1 ? null : w.title);

  const pendingSupportStudent = students.find((student) => {
    const flag = localFlags[student.id];
    return flag ? supportActionPending(flag) : false;
  });

  /**
   * Grade writes (cells, rubric weights) need the Apoyos log reviewed first.
   * Structural work — adding, closing, reordering columns — does not: a column
   * is not a student's grade, so it must never be blocked by a support review.
   */
  function guardSupports(): boolean {
    if (!pendingSupportStudent) return true;
    setError(copy.supportsPending);
    void openSupportReview(pendingSupportStudent);
    return false;
  }

  async function openRubric(mode: "wizard" | "edit") {
    if (!guardSupports()) return;
    // Re-read the rubric before opening: a page loaded before a migration or a
    // backfill must not send a partial payload to the save RPC.
    const res = await fetchSubjectExams({ classId, subjectId });
    if (res.ok) {
      setExams(res.exams);
      setRubros(res.rubros);
      const anyActive = res.rubros.some((rubro) => !rubro.archived);
      setRubricMode(mode === "wizard" && anyActive ? "edit" : mode);
      return;
    }
    setRubricMode(mode);
  }

  async function openAddColumn() {
    // Deliberately ungated: creating a column is structure, not a grade write.
    if (!subjectId) {
      setAddOpen(true);
      return;
    }
    const res = await fetchSubjectExams({ classId, subjectId });
    if (res.ok) {
      setExams(res.exams);
      setRubros(res.rubros);
    }
    const current = (res.ok ? res.rubros : rubros).filter(
      (rubro) => !rubro.archived,
    );
    if (current.length === 0) setRubricMode("wizard");
    else setAddOpen(true);
  }

  function closeRubric() {
    if (rubricMode === "wizard" && rubros.length === 0 && subjectId) {
      try {
        window.localStorage.setItem(
          `weeon:rubro-skip:${classId}:${subjectId}`,
          "1",
        );
      } catch {
        // Storage is optional (private mode); the card stays as the way back.
      }
    }
    setRubricMode(null);
  }

  // Density drives every cell, not just the grade columns, so the toggle is
  // visible on a subject that has no columns yet.
  const rowY = dense ? "py-0.5" : "py-1.5";
  const headY = dense ? "py-1.5" : "py-2";
  // Column width grows with density so the label can carry more of the name.
  const colWidth = dense
    ? "w-[2.75rem]"
    : density === "cozy"
      ? "w-[5.5rem]"
      : "w-[9rem]";
  // One subtotal column closes every rubro group (points + the rubro grade).
  const subtotalWidth = dense ? "w-[4.5rem]" : "w-[5.5rem]";
  const colTop = dense ? "top-8" : "top-9";
  const colHeadH = dense ? "min-h-8" : "min-h-10";


  // Columns are displayed grouped by rubro: rubros in the teacher's saved
  // order, columns inside a rubro grouped by kind. The first block of a rubro
  // is the saved one; the rest (same rubro again) follow it in creation order.
  const rubroById = new Map(rubros.map((rubro) => [rubro.id, rubro]));
  const savedBlockOrder: string[] = [
    ...activeRubros
      .slice()
      .sort((a, b) => a.position - b.position)
      .map((rubro) => rubro.id),
    "__none",
  ];
  const effectiveBlockOrder = blockOrder ?? savedBlockOrder;
  const blockRank = new Map(effectiveBlockOrder.map((key, index) => [key, index]));
  // The teacher's view is exactly what is saved: same positions means the
  // drag keys (which are positional) are still valid.
  const blockOrderDirty =
    blockOrder != null && blockOrder.join("|") !== savedBlockOrder.join("|");
  const dragEnabled = !blockOrderDirty;

  const orderedExams = [...exams]
    .filter((column) => {
      const rubro = column.rubroId ? rubroById.get(column.rubroId) : null;
      return !rubro?.archived;
    })
    .sort((a, b) => {
      const ra = blockRank.get(blockBucket(a.rubroId)) ?? effectiveBlockOrder.length;
      const rb = blockRank.get(blockBucket(b.rubroId)) ?? effectiveBlockOrder.length;
      if (ra !== rb) return ra - rb;
      return KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind);
    });

  // Auto label per column: short code + sequence among that type (CW 1) for the
  // compact view, and the full kind name (Classwork 1) for the expanded view.
  // A teacher-renamed column keeps its own title; the sequence is only the
  // default so a fresh gradebook reads "Tarea 1 / Tarea 2" without setup.
  const labels = new Map<
    string,
    { short: string; medium: string; full: string }
  >();
  const counters = new Map<AssignmentKind, number>();
  for (const column of orderedExams) {
    const next = (counters.get(column.kind) ?? 0) + 1;
    counters.set(column.kind, next);
    const custom = column.title.trim();
    const auto = {
      short: `${w.kindShort[column.kind]} ${next}`,
      medium: `${w.kindMedium[column.kind]} ${next}`,
      full: `${w.kinds[column.kind]} ${next}`,
    };
    labels.set(
      column.id,
      custom && custom !== auto.full ? { short: custom, medium: custom, full: custom } : auto,
    );
  }

  const groups = buildRubroGroups(orderedExams, rubros);
  const orderedIndex = new Map(orderedExams.map((column, index) => [column.id, index]));
  const pesoTotal = totalPeso(rubros);
  // Weights must add up to 100 %; the amber banner links back to the editor.
  const pesoIncomplete = activeRubros.length > 0 && pesoTotal !== 100;
  // Weighted only when the rubric exists and at least one column is assigned.

  /**
   * Sequenced titles for a bulk create inside one rubro. Numbers continue after
   * the columns already in that rubro, so two more Tareas when one exists yields
   * "Tarea 2" and "Tarea 3".
   */
  function titlesFor(rubroId: string, count: number): string[] {
    const rubro = rubros.find((item) => item.id === rubroId);
    const kind = kindForRubro(rubro?.name ?? "");
    // Count per rubro (not per kind) so the sequence matches the group the
    // teacher is looking at, even if two rubros share a kind.
    const existing = exams.filter((column) => column.rubroId === rubroId).length;
    const total = Math.max(1, Math.min(MAX_NEW_COLUMNS, count));
    return Array.from(
      { length: total },
      (_, index) => `${w.kinds[kind]} ${existing + index + 1}`,
    );
  }

  /**
   * Everything the scoreboard shows comes from `lib/dashboard/scoreboard.ts`
   * (via `studentFinal`, `rubroScore`, `classStats`). Keeping a single model is
   * what stops a cell, its footer and FINAL from disagreeing.
   */
  const finalFor = new Map<string, FinalScore>();
  for (const student of students) {
    finalFor.set(student.id, finalScore(rubros, exams, student.id));
  }

  function finalForStudent(studentId: string): number | null {
    return displayPercent(finalFor.get(studentId)?.percent ?? null);
  }

  /** Rubro grade 0–100 for one student in one rubro. */
  function rubroPercentForStudent(rubroId: string, studentId: string): number | null {
    const final = finalFor.get(studentId);
    return final?.rubricos.find((item) => item.rubroId === rubroId)?.percent ?? null;
  }

  /** Rubro grade for a block (a split block shows its rubro's grade). */
  function rubroPercentForGroupStudent(
    group: RubroGroup,
    studentId: string,
  ): number | null {
    if (!group.rubroId) return null;
    return rubroPercentForStudent(group.rubroId, studentId);
  }

  /** A student's points inside a block, out of the block's max points. */
  function blockPointsForStudent(
    group: RubroGroup,
    studentId: string,
  ): { earned: number | null; max: number } {
    let earned = 0;
    let max = 0;
    let graded = false;
    for (const column of group.columns) {
      max += columnMaxPoints(column);
      const grade = column.grades[studentId];
      if (!grade) continue;
      earned += grade.mark;
      graded = true;
    }
    return { earned: graded ? earned : null, max };
  }


  /**
   * Students in the order the teacher asked for. Filters (`Pendientes`,
   * `En riesgo`) and sorting are views only — they never touch the data.
   */
  const visibleStudents = (() => {
    const base = students.filter((student) =>
      studentName(student).toLowerCase().includes(query.trim().toLowerCase()),
    );
    const filtered = base.filter((student) => {
      const final = finalFor.get(student.id);
      if (onlyPending && final?.percent != null) return false;
      if (onlyAtRisk) {
        const risk = final ? canStillPass(final) : null;
        if (risk?.pass !== false) return false;
      }
      return true;
    });
    if (sortBy === "name") return filtered;
    return [...filtered].sort((a, b) => {
      const fa = finalFor.get(a.id)?.percent ?? null;
      const fb = finalFor.get(b.id)?.percent ?? null;
      if (fa == null && fb == null) return studentName(a).localeCompare(studentName(b), "es");
      if (fa == null) return 1;
      if (fb == null) return -1;
      return sortBy === "finalAsc" ? fa - fb : fb - fa;
    });
  })();

  const finalStats = classStats(
    students.map((student) => finalFor.get(student.id)?.percent ?? null),
  );

  /** Class average of a rubro grade (footer `Promedio del rubro`). */
  const rubroAverageForVisible = (group: RubroGroup): number | null => {
    if (!group.rubroId) return null;
    const values = visibleStudents.map((student) =>
      rubroPercentForStudent(group.rubroId!, student.id),
    );
    const nums = values.filter((value): value is number => value != null);
    if (nums.length === 0) return null;
    return Math.round((nums.reduce((sum, value) => sum + value, 0) / nums.length) * 10) / 10;
  };

  /** Class average of a block's points (footer under each column). */
  const blockPointsAverageForVisible = (group: RubroGroup): number | null => {
    const values = visibleStudents.map((student) =>
      blockPointsForStudent(group, student.id).earned,
    );
    const nums = values.filter((value): value is number => value != null);
    if (nums.length === 0) return null;
    return Math.round((nums.reduce((sum, value) => sum + value, 0) / nums.length) * 10) / 10;
  };

  const overall = finalStats.average;
  async function changeSubject(nextId: string | null) {
    setSubjectId(nextId);
    setError(null);
    setBlockOrder(null);
    setLoading(true);
    const res = await fetchSubjectExams({ classId, subjectId: nextId });
    setLoading(false);
    if (res.ok) {
      setExams(res.exams);
      setRubros(res.rubros);
    } else setError(res.error);
  }

  async function refresh() {
    const res = await fetchSubjectExams({ classId, subjectId });
    if (res.ok) {
      setExams(res.exams);
      setRubros(res.rubros);
    }
  }

  /**
   * Patch one grade in place after a save.
   *
   * The gradeboard used to refetch every column and every mark on each edit,
   * which is what made typing feel slow: the value was already on screen, but
   * the class average, the rubro totals and FINAL waited for a full round trip
   * over the whole subject. Patching the one row is instant and produces the
   * same state the refetch would.
   */
  function applyGradeLocally(
    assignmentId: string,
    studentId: string,
    mark: number | null,
  ) {
    setExams((current) =>
      current.map((column) => {
        if (column.id !== assignmentId) return column;
        const grades = { ...column.grades };
        if (mark == null) {
          delete grades[studentId];
        } else {
          grades[studentId] = {
            mark,
            maxMarks: columnMaxPoints(column),
            status: "graded",
          };
        }
        return { ...column, grades };
      }),
    );
  }

  /* ── Inline rubro editing ────────────────────────────────────────────────
     The header pill *is* the form: name and peso commit on Enter/blur. Each
     write is optimistic and reverted when the server refuses, mirroring the
     column rename. */

  async function handleRenameRubro(rubro: GradeRubro, nextName: string): Promise<boolean> {
    const previous = rubro.name;
    startTransition(() => {
      setRubros((current) =>
        current.map((item) => (item.id === rubro.id ? { ...item, name: nextName } : item)),
      );
    });
    setRubroBusy(rubro.id);
    const res = await updateRubro({ classId, rubroId: rubro.id, name: nextName });
    setRubroBusy(null);
    if (!res.ok) {
      startTransition(() => {
        setRubros((current) =>
          current.map((item) => (item.id === rubro.id ? { ...item, name: previous } : item)),
        );
      });
      setError(res.error);
      return false;
    }
    return true;
  }

  async function handleUpdatePeso(rubro: GradeRubro, nextPeso: number): Promise<boolean> {
    const previous = rubro.peso;
    startTransition(() => {
      setRubros((current) =>
        current.map((item) => (item.id === rubro.id ? { ...item, peso: nextPeso } : item)),
      );
    });
    setRubroBusy(rubro.id);
    const res = await updateRubro({ classId, rubroId: rubro.id, peso: nextPeso });
    setRubroBusy(null);
    if (!res.ok) {
      startTransition(() => {
        setRubros((current) =>
          current.map((item) => (item.id === rubro.id ? { ...item, peso: previous } : item)),
        );
      });
      setError(res.error);
      return false;
    }
    return true;
  }

  async function handleAddRubro(
    name: string,
    peso: number,
    afterRubroId: string | null,
  ): Promise<string | null> {
    if (!subjectId) return null;
    setError(null);
    setRubroBusy("new");
    const res = await createRubro({
      classId,
      subjectId,
      name,
      peso,
      afterRubroId,
    });
    setRubroBusy(null);
    if (!res.ok) {
      setError(res.error);
      return null;
    }
    setBlockOrder(null);
    await refresh();
    return res.id ?? null;
  }

  /**
   * "Nuevo rubro" from the toolbar: creates an empty rubro (name placeholder,
   * weight 0) and opens its header for renaming/reweighting. An empty rubro
   * never perturbs the FIN, and it can be deleted again without touching a
   * grade. Growing the rubric is a rubric decision, so the control lives next
   * to "Editar rubros" instead of inside the grade grid.
   */
  async function handleAddRubroQuick() {
    if (!subjectId) return;
    if (!guardSupports()) return;
    const base = copy.addRubroPlaceholder;
    const taken = new Set(activeRubros.map((rubro) => rubro.name.toLowerCase()));
    let name = base;
    let suffix = 2;
    while (taken.has(name.toLowerCase())) {
      name = `${base} ${suffix++}`;
    }
    const id = await handleAddRubro(name, 0, null);
    if (id) setEditRubroId({ id, field: "name" });
  }

  async function handleDeleteRubro() {    if (!rubroDeleteTarget) return;
    const rubro = rubroDeleteTarget;
    setRubroBusy(rubro.id);
    const res = await deleteRubro({ classId, rubroId: rubro.id });
    setRubroBusy(null);
    setRubroDeleteTarget(null);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setBlockOrder(null);
    await refresh();
  }

  /* ── Block drag & drop ───────────────────────────────────────────────────
     Dragging a header's grip moves the whole block of columns. The block order
     is followed live (no placeholder column), and on release the new order is
     persisted; a failed save restores the saved order. */

  function orderedRubroIds(nextBlocks: string[]): string[] {
    const ids = nextBlocks.filter((key) => key !== "__none");
    for (const rubro of rubros) {
      if (!ids.includes(rubro.id)) ids.push(rubro.id);
    }
    return ids;
  }

  async function persistBlockOrder(nextBlocks: string[]) {
    if (!subjectId) return;
    const nextGroups = buildRubroGroups(
      orderColumnsByBlocks(
        orderedExams,
        (column) => column.rubroId,
        nextBlocks,
      ),
      rubros,
    );
    const assignmentIds = nextGroups.flatMap((group) =>
      group.columns.map((column) => column.id),
    );
    setLoading(true);
    const res = await reorderGradebook({
      classId,
      subjectId,
      assignmentIds,
      rubroIds: orderedRubroIds(nextBlocks),
    });
    setLoading(false);
    if (!res.ok) {
      setBlockOrder(null);
      setError(res.error);
      return;
    }
    await refresh();
  }

  function endDrag() {
    const drag = draggingRef.current;
    draggingRef.current = null;
    setDraggingBlock(null);
    if (!drag?.active) return;
    void persistBlockOrder(blockOrder ?? savedBlockOrder);
  }

  function beginBlockDrag(group: RubroGroup, event: ReactPointerEvent<HTMLElement>) {
    if (!dragEnabled) return;
    event.preventDefault();
    const startX = event.clientX;
    const startY = event.clientY;
    draggingRef.current = {
      id: group.rubroId ?? "__none",
      key: group.key,
      startX,
      startY,
      active: false,
    };

    function onMove(moveEvent: PointerEvent) {
      const drag = draggingRef.current;
      if (!drag) {
        cleanup();
        return;
      }
      if (!drag.active) {
        const moved =
          Math.abs(moveEvent.clientX - startX) + Math.abs(moveEvent.clientY - startY);
        if (moved < 8) return;
        drag.active = true;
        setDraggingBlock(drag.id);
      }
      // Drop the block on whichever header cell the pointer is over.
      const target = document
        .elementFromPoint(moveEvent.clientX, moveEvent.clientY)
        ?.closest<HTMLElement>("[data-block-id]");
      const overKey = target?.dataset.blockKey;
      const overId = target?.dataset.blockId;
      if (!overId || !overKey || overKey === drag.key) return;
      setBlockOrder((current) => {
        const base = current ?? savedBlockOrder;
        const from = base.indexOf(drag.id);
        const to = base.indexOf(overId);
        if (from < 0 || to < 0 || from === to) return base;
        return moveItem(base, from, to);
      });
      drag.key = overKey;
    }

    function cleanup() {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    }

    function onUp() {
      cleanup();
      endDrag();
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  }

  async function handleCreate(
    titles: string[],
    points: number | null,
    kind: AssignmentKind,
    rubroId: string,
  ) {
    setError(null);
    const res = await addExamColumns({
      classId,
      points,
      subjectId,
      kind,
      rubroId,
      titles,
    });
    if (!res.ok) {
      setError(res.error);
      return false;
    }
    await refresh();
    return true;
  }

  /**
   * Delete asks first. A column carries every student's mark, so an accidental
   * tap on the trash icon (easy on an iPad) must not destroy it silently.
   */
  function deleteColumn(column: ExamColumn) {
    setError(null);
    setDeleteTarget(column);
  }

  /**
   * Inline rename from the column header. The header commits optimistically, so
   * `nextTitle` is already on screen; we persist in the background and only
   * revert if the server rejects it. Only the title changes — points stay locked
   * once the column has grades (see `updateExamColumn`).
   */
  async function handleRenameColumn(
    column: ExamColumn,
    nextTitle: string,
  ): Promise<boolean> {
    const title = nextTitle.trim();
    setError(null);
    if (!title || title === column.title) return true;

    const previousTitle = column.title;
    startTransition(() => {
      setExams((current) =>
        current.map((item) =>
          item.id === column.id ? { ...item, title } : item,
        ),
      );
    });

    const res = await updateExamColumn({
      classId,
      assignmentId: column.id,
      title,
    });
    if (!res.ok) {
      startTransition(() => {
        setExams((current) =>
          current.map((item) =>
            item.id === column.id ? { ...item, title: previousTitle } : item,
          ),
        );
      });
      setError(res.error);
      return false;
    }
    return true;
  }

  /** Points are frozen once a column has marks (server + DB trigger agree). */
  function hasGrades(column: ExamColumn): boolean {
    return Object.keys(column.grades).length > 0;
  }

  async function handleUpdatePoints(
    column: ExamColumn,
    nextPoints: number | null,
  ): Promise<boolean> {
    setError(null);
    const previous = column.points;
    startTransition(() => {
      setExams((current) =>
        current.map((item) =>
          item.id === column.id ? { ...item, points: nextPoints } : item,
        ),
      );
    });
    const res = await updateExamColumn({
      classId,
      assignmentId: column.id,
      points: nextPoints,
    });
    if (!res.ok) {
      startTransition(() => {
        setExams((current) =>
          current.map((item) =>
            item.id === column.id ? { ...item, points: previous } : item,
          ),
        );
      });
      setError(res.error);
      return false;
    }
    return true;
  }

  async function handleDeleteColumn() {
    if (!deleteTarget) return;
    const column = deleteTarget;
    setDeleting(true);
    const res = await removeExamColumn({ classId, assignmentId: column.id });
    setDeleting(false);
    setDeleteTarget(null);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    startTransition(() => {
      setExams((current) => current.filter((item) => item.id !== column.id));
    });
    await refresh();
  }

  async function handleCloseColumn() {
    if (!closeTarget) return;
    setClosing(true);
    const column = closeTarget;
    const res = await closeExamColumn({ classId, assignmentId: column.id });
    setClosing(false);
    setCloseTarget(null);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    await refresh();
  }

  function exportCsv() {
    // Same model as the screen: each rubro block exports its points and its
    // grade, then FINAL, so a spreadsheet read by dirección matches the table.
    const groupFor = (columnId: string): RubroGroup | undefined =>
      groups.find((group) => group.columns.some((column) => column.id === columnId));
    const rubroRow = orderedExams.map((column) => {
      const group = groupFor(column.id);
      if (!group?.name) return "";
      return group.peso == null ? group.name : `${group.name} ${group.peso}%`;
    });
    const header = [
      t.gradebook.headers.student,
      ...orderedExams.map((column) => {
        const label = labels.get(column.id)?.medium ?? column.title;
        return `${label} (${w.columnPointsShort(columnMaxPoints(column))})`;
      }),
      sb.finalColumn,
    ];
    const rubroHeader = [t.gradebook.headers.student, ...rubroRow, ""];
    const rows = visibleStudents.flatMap((student) => {
      const base = [
        studentName(student),
        ...orderedExams.map((column) => {
          const grade = column.grades[student.id];
          if (!grade) return "";
          const max = cellMax(column, student.id);
          return `${grade.mark}/${max}`;
        }),
      ];
      const final = finalForStudent(student.id);
      return [
        [...base, final == null ? "" : `${final}${w.finalPercentSuffix}`],
        [
          " ",
          ...groups.flatMap((group) => {
            const points = blockPointsForStudent(group, student.id);
            const grade = rubroPercentForGroupStudent(group, student.id);
            return [
              points.earned == null ? "" : `${formatPoints(points.earned)}/${formatPoints(points.max)}`,
              grade == null ? "" : `${Math.round(grade)}${w.finalPercentSuffix}`,
            ];
          }),
          "",
        ],
      ];
    });
    const footer = [
      sb.classAverage,
      ...orderedExams.map((column) => {
        const values = visibleStudents.map((student) => columnPct(column, student.id));
        const nums = values.filter((value): value is number => value != null);
        if (nums.length === 0) return "";
        return `${Math.round(nums.reduce((sum, value) => sum + value, 0) / nums.length)}${w.finalPercentSuffix}`;
      }),
      finalStats.average == null
        ? ""
        : `${finalStats.average}${w.finalPercentSuffix}`,
    ];
    const csv = [rubroHeader, header, ...rows, [], footer]
      .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${groupName}${subjectName ? `-${subjectName}` : ""}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="print-scoreboard flex flex-col gap-4 sm:gap-5">
      <header className="print-hide flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex flex-col">
          <h1 className="brand-page-title text-2xl font-bold text-foreground sm:text-3xl lg:text-4xl">
            {groupName}
          </h1>
          {subjectName ? (
            <p className="mt-0.5 text-sm font-medium text-foreground/55">{subjectName}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {subjectId ? (
            <div className="inline-flex min-w-0 items-stretch overflow-hidden rounded-full border border-border">
              <button
                type="button"
                onClick={() => void openRubric(activeRubros.length === 0 ? "wizard" : "edit")}
                className="inline-flex h-9 min-w-0 items-center gap-1.5 truncate pl-3.5 pr-3 text-sm font-semibold text-foreground/70 ui-hover sm:pl-3.5"
              >
                <SlidersHorizontal className="h-4 w-4 shrink-0" />
                <span className="truncate">{copy.edit}</span>
              </button>
              {/* Growing the rubric is a rubric decision, not a grade cell: it
                  belongs next to the other rubric actions, not in the grid. */}
              <button
                type="button"
                onClick={() => void handleAddRubroQuick()}
                title={copy.addRubro}
                aria-label={copy.addRubro}
                className="inline-flex h-9 w-9 items-center justify-center border-l border-border text-foreground/70 ui-hover hover:text-brand-600 dark:hover:text-brand-300"
              >
                <Plus className="h-4 w-4" strokeWidth={2.5} />
              </button>
            </div>
          ) : null}
          <button
            type="button"
            onClick={() =>
              setDensity(
                DENSITY_ORDER[(DENSITY_ORDER.indexOf(density) + 1) % DENSITY_ORDER.length],
              )
            }
            title={w.density}
            aria-label={w.density}
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border px-3 text-sm font-semibold text-foreground/70 ui-hover sm:px-3.5"
          >
            {density === "expanded" ? (
              <Minimize2 className="h-4 w-4 shrink-0" />
            ) : (
              <Maximize2 className="h-4 w-4 shrink-0" />
            )}
            <span className="hidden sm:inline">
              {density === "compact" ? w.dense : density === "cozy" ? w.cozy : w.expanded}
            </span>
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            title={sb.print}
            aria-label={sb.print}
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border px-3 text-sm font-semibold text-foreground/70 ui-hover sm:px-3.5"
          >
            <Printer className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">{sb.print}</span>
          </button>
          <button
            type="button"
            onClick={exportCsv}
            disabled={exams.length === 0}
            title={w.export}
            aria-label={w.export}
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border px-3 text-sm font-semibold text-foreground/70 ui-hover disabled:opacity-50 sm:px-3.5"
          >
            <Download className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">{w.export}</span>
          </button>
          <SubmitReport
            classId={classId}
            subjectId={subjectId}
            subjectName={subjectName}
            disabled={exams.length === 0}
          />
          <button
            type="button"
            onClick={() => void openAddColumn()}
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-brand-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-700 active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} />
            {w.addColumn}
          </button>
        </div>
      </header>

      {classContext.subjects.length > 1 ? (
        <div className={SEGMENT_TRACK}>
          {classContext.subjects.map((option) => {
            const active = option.id === subjectId;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => void changeSubject(option.id)}
                className={cn(
                  "shrink-0 rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors",
                  hubToneSegment("blue", active),
                )}
              >
                {option.name}
              </button>
            );
          })}
        </div>
      ) : null}

      {/* Print-to-PDF header: dirección needs the school, subject, rubric and
          date on the page, which the app chrome does not provide on paper. */}
      <div className="hidden print:block">
        <p className="text-lg font-bold text-foreground">
          {classContext.name} · {subjectName}
        </p>
        <p className="text-sm text-foreground/60">
          {activeRubros
            .map((rubro) => `${rubro.name} ${rubro.peso}%`)
            .join(" · ")}{" "}
          — {sb.legend}
        </p>
      </div>

      <ScoreboardSummary
        average={finalStats.average}
        median={finalStats.median}
        passRate={finalStats.passRate}
        highest={finalStats.highest}
        lowest={finalStats.lowest}
        graded={finalStats.graded}
        total={finalStats.total}
      />

      <GradebookToolbar
        query={query}
        onQueryChange={setQuery}
        sortBy={sortBy}
        onSortChange={setSortBy}
        onlyPending={onlyPending}
        onTogglePending={() => setOnlyPending((on) => !on)}
        onlyAtRisk={onlyAtRisk}
        onToggleAtRisk={() => setOnlyAtRisk((on) => !on)}
        markView={markView}
        onMarkViewChange={setMarkView}
        phoneView={phoneView}
        onPhoneViewChange={setPhoneView}
        passMark={PASS}
      />

      {pesoIncomplete && !rubricMode ? (
        <button
          type="button"
          onClick={() => void openRubric("edit")}
          className="print-hide flex items-center justify-between gap-3 rounded-xl border border-[#f5d88a] bg-[#fdeecd] px-4 py-2.5 text-left text-sm font-semibold text-[#92400e] dark:border-[#5b4318] dark:bg-[#3a2a12] dark:text-[#fde68a]"
        >
          <span>{copy.pesoWarning(pesoTotal)}</span>
          <span className="shrink-0 underline">{copy.edit}</span>
        </button>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-error/30 bg-error/10 px-4 py-2.5 text-sm font-medium text-error">
          {error}
        </div>
      ) : null}

      {deleteTarget ? (
        <ConfirmDialog
          open
          title={w.deleteColumnConfirm}
          description={labels.get(deleteTarget.id)?.medium ?? deleteTarget.title}
          confirmLabel={w.deleteColumn}
          cancelLabel={t.gradebook.cancel}
          pending={deleting}
          onConfirm={() => void handleDeleteColumn()}
          onCancel={() => {
            if (!deleting) setDeleteTarget(null);
          }}
        />
      ) : null}

      {subjectId && activeRubros.length === 0 ? (
        <div className="flex flex-col gap-2 rounded-2xl border border-dashed border-border bg-surface-muted/40 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-bold text-foreground">{copy.noRubros}</p>
            <p className="mt-0.5 max-w-2xl text-xs font-medium text-foreground/55">
              {copy.noRubrosHint}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void openRubric("wizard")}
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-brand-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
          >
            <Plus className="h-4 w-4" />
            {copy.create}
          </button>
        </div>
      ) : null}

      {students.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border px-4 py-10 text-center text-sm font-medium text-foreground/50">
          {w.noStudents}
        </p>
      ) : visibleStudents.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border px-4 py-10 text-center text-sm font-medium text-foreground/50">
          {sb.noActiveStudents}
        </p>
      ) : (
        <>
          {/* Phone: one card per student, unless the teacher asked for the grid. */}
          <div className={cn("[@media(orientation:landscape)]:hidden", !showCards && "hidden")}>
            <ScoreboardStudentList
              stats={finalStats}
              hrefFor={(studentId) =>
                `/estudiantes/${studentId}?from=${encodeURIComponent(`/grupos/${classId}`)}`
              }
              onGrade={(studentId) => setGradingStudentId(studentId)}
              students={visibleStudents.map((student) => {
                const risk = canStillPass(finalFor.get(student.id) ?? finalScore(rubros, exams, student.id));
                return {
                  id: student.id,
                  name: studentName(student),
                  final: finalForStudent(student.id),
                  atRisk: risk?.pass === false,
                  needed:
                    risk?.pass && risk.neededOnRemaining != null && risk.neededOnRemaining > 0
                      ? risk.neededOnRemaining
                      : null,
                  // One bar per active rubro, in the same order as the matrix.
                  rubros: activeRubros
                    .filter((rubro) => exams.some((column) => column.rubroId === rubro.id))
                    .map((rubro) => ({
                      key: rubro.id,
                      name: rubro.name,
                      peso: rubro.peso,
                      percent: rubroPercentForStudent(rubro.id, student.id),
                    })),
                };
              })}
            />
          </div>
        </>
      )}

      {visibleStudents.length > 0 ? (
        <div
          className={cn(
            "relative min-w-0 overflow-auto overscroll-x-contain rounded-2xl border border-border bg-surface",
            // Cards are the phone default; `grid` here means the teacher opted
            // in. From `md` up the matrix is always shown, cards or not.
            // The matrix shows in landscape whatever the switch says; in portrait
            // it is the teacher's explicit choice.
            showCards && "[@media(orientation:portrait)]:hidden",
            draggingBlock && "select-none",
          )}
        >
            {loading ? (
              <div className="absolute inset-0 z-40 flex items-center justify-center bg-surface/60 backdrop-blur-[1px]">
                <Loader2 className={cn("h-6 w-6 animate-spin", ACCENT_TEXT)} />
              </div>
            ) : null}

            <table className="w-full table-fixed border-separate border-spacing-0 text-sm">
              <thead>
                {/* Group row — consecutive columns of the same category */}
                <tr>
                  <th
                    rowSpan={2}
                    className={cn("sticky left-0 top-0 z-50 w-10 border-b border-r border-border bg-surface px-2 text-center text-xs font-bold text-foreground/40", headY)}
                  >
                    #
                  </th>
                  <th
                    rowSpan={2}
                    className={cn("sticky left-10 top-0 z-50 w-[13.5rem] border-b border-r border-border bg-surface px-3 text-left text-xs font-bold uppercase tracking-wide text-foreground/50", headY)}
                  >
                    {t.gradebook.headers.student}
                  </th>
                  {groups.map((group) => {
                    const rubro = group.rubroId
                      ? (rubroById.get(group.rubroId) ?? null)
                      : null;
                    const usedColumns = group.rubroId
                      ? exams.filter((column) => column.rubroId === group.rubroId).length
                      : 0;
                    return (
                      <th
                        key={group.key}
                        colSpan={group.columns.length + 1}
                        data-block-id={group.rubroId ?? "__none"}
                        data-block-key={group.key}
                        className={cn(
                          "sticky top-0 z-40 border-b border-l-2 border-foreground/25 bg-surface-muted px-2 text-center leading-none transition-opacity",
                          dense ? "h-8" : "h-9",
                          draggingBlock === (group.rubroId ?? "__none") &&
                            "opacity-60 ring-2 ring-brand-400/60",
                        )}
                      >
                        <RubroHeaderCell
                          name={group.name}
                          peso={group.peso}
                          canManage={Boolean(subjectId && rubro)}
                          canDelete={usedColumns === 0}
                          pesoIncomplete={pesoIncomplete}
                          busy={rubro != null && rubroBusy === rubro.id}
                          onCommitName={(next) =>
                            rubro ? handleRenameRubro(rubro, next) : Promise.resolve(false)
                          }
                          onCommitPeso={(next) =>
                            rubro ? handleUpdatePeso(rubro, next) : Promise.resolve(false)
                          }
                          onDelete={() => {
                            if (!rubro) return;
                            if (usedColumns > 0) {
                              setError(copy.hasColumns);
                              return;
                            }
                            setRubroDeleteTarget(rubro);
                          }}
                          onDragStart={
                            dragEnabled ? (event) => beginBlockDrag(group, event) : undefined
                          }
                          autoEdit={
                            rubro && editRubroId?.id === rubro.id
                              ? editRubroId.field
                              : null
                          }
                          onAutoEditHandled={() => setEditRubroId(null)}
                        />
                      </th>
                    );
                  })}
                  <th
                    rowSpan={2}
                    className={cn(
                      "sticky right-0 top-0 z-50 min-w-[6rem] whitespace-nowrap border-b border-l-2 border-l-foreground/25 bg-surface-muted px-2 text-center align-middle",
                      headY,
                    )}
                  >
                    <div className="flex items-baseline justify-center gap-1 py-1">
                      <span className={cn("text-xs font-bold uppercase tracking-wide", ACCENT_TEXT)}>
                        {w.final}
                      </span>
                      <span className="text-[9px] font-semibold text-foreground/65">
                        {w.finalPercentSuffix}
                      </span>
                    </div>
                  </th>
                </tr>

                {/* Column labels row */}
                <tr>
                  {groups.map((group) => (
                    <Fragment key={group.key}>
                      {group.columns.map((column, columnIndex) => {
                        const label = labels.get(column.id) ?? {
                          short: column.title,
                          medium: column.title,
                          full: column.title,
                        };
                        return (
                          <th
                            key={column.id}
                            className={cn(
                              "sticky z-30 border-b border-r border-border bg-surface px-1 text-center align-middle",
                              columnIndex === 0 && "border-l-2 border-l-foreground/25",
                              colTop,
                              colHeadH,
                              colWidth,
                            )}
                          >
                            <ColumnHeader
                              column={column}
                              label={label}
                              density={density}
                              pointsEditable={!hasGrades(column)}
                              onRename={(title) => handleRenameColumn(column, title)}
                              onRenamePoints={(points) => handleUpdatePoints(column, points)}
                              onDelete={() => deleteColumn(column)}
                              onClose={
                                column.assessmentId || column.closedAt
                                  ? undefined
                                  : () => setCloseTarget(column)
                              }
                            />
                          </th>
                        );
                      })}
                      <th
                        className={cn(
                          "sticky z-30 border-b border-r border-border bg-surface-muted px-0.5 text-center align-middle",
                          colTop,
                          colHeadH,
                          subtotalWidth,
                        )}
                        title={sb.rubroPoints}
                      >
                        <span className="block text-[9px] font-bold uppercase leading-tight tracking-[0.08em] text-[#5b21b6] dark:text-[#c4b5fd]">
                          {copy.subtotal}
                        </span>
                        <span className="block text-[8px] font-semibold uppercase tracking-[0.06em] text-foreground/65">
                          {copy.pointsShort} · {w.finalPercentSuffix}
                        </span>
                      </th>
                    </Fragment>
                  ))}
                </tr>
              </thead>

              <tbody>
                {visibleStudents.map((student, rowIndex) => {
                  const final = finalForStudent(student.id);
                  const risk = canStillPass(finalFor.get(student.id) ?? finalScore(rubros, exams, student.id));
                  return (
                    <tr key={student.id} className={cn("group", dense ? "h-8" : "h-9")}>
                      <td className={cn("sticky left-0 z-20 border-b border-r border-border bg-surface px-2 text-center text-xs font-semibold text-foreground/35", rowY)}>
                        {rowIndex + 1}
                      </td>
                      <td className={cn("sticky left-10 z-20 border-b border-r border-border bg-surface px-3", rowY)}>
                        <div className="flex min-w-0 items-center gap-1.5">
                          <Link
                            href={`/estudiantes/${student.id}?from=${encodeURIComponent(`/grupos/${classId}`)}`}
                            title={studentName(student)}
                            className="font-medium leading-tight text-foreground transition-colors hover:text-[#5b21b6] dark:hover:text-[#c4b5fd]"
                          >
                            {studentName(student)}
                          </Link>
                          <EducationalSupportBadgeButton
                            count={localFlags[student.id]?.activeCount ?? 0}
                            needsReview={localFlags[student.id]?.needsReview ?? false}
                            needsPeriodRegistration={
                              localFlags[student.id]?.needsPeriodRegistration ?? false
                            }
                            onClick={() => void openSupportReview(student)}
                          />
                          {/* Dirección's early-warning: a student who can no
                              longer reach the pass mark with the weight left. */}
                          {risk?.pass === false ? (
                            <span
                              title={sb.cannotPass}
                              aria-label={sb.atRisk}
                              className="inline-flex shrink-0 items-center rounded-full bg-error/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-error"
                            >
                              {sb.atRisk}
                            </span>
                          ) : null}
                          {risk?.pass && risk.neededOnRemaining != null && risk.neededOnRemaining > 0 ? (
                            <span
                              title={sb.atRiskHint(risk.neededOnRemaining)}
                              className="shrink-0 text-[9px] font-semibold tabular-nums text-[#92400e] dark:text-[#fde68a]"
                            >
                              {risk.neededOnRemaining}%
                            </span>
                          ) : null}
                        </div>
                      </td>
                      {groups.map((group) => (
                        <Fragment key={group.key}>
                          {group.columns.map((column, columnIndex) => {
                            const colIndex = orderedIndex.get(column.id) ?? 0;
                            return (
                              <td
                                key={column.id}
                                className={cn(
                                  "border-b border-r border-border px-0.5",
                                  columnIndex === 0 && "border-l-2 border-l-foreground/25",
                                )}
                              >
                                <GradeCell
                                  key={`${column.id}:${student.id}`}
                                  classId={classId}
                                  column={column}
                                  label={labels.get(column.id)?.medium ?? column.title}
                                  studentId={student.id}
                                  row={rowIndex}
                                  col={colIndex}
                                  dense={dense}
                                  markView={markView}
                                  supportPending={supportActionPending({
                                    needsReview: localFlags[student.id]?.needsReview ?? false,
                                    needsPeriodRegistration:
                                      localFlags[student.id]?.needsPeriodRegistration ?? false,
                                  })}
                                  onRequireReview={() => void openSupportReview(student)}
                                  onSaved={(mark) =>
                                    applyGradeLocally(column.id, student.id, mark)
                                  }
                                />
                              </td>
                            );
                          })}
                          <td
                            className={cn(
                              "border-b border-r border-border bg-surface-muted/30 px-1 text-center",
                              rowY,
                              subtotalWidth,
                            )}
                          >
                            {(() => {
                              const points = blockPointsForStudent(group, student.id);
                              const grade = rubroPercentForGroupStudent(group, student.id);
                              const title =
                                grade == null
                                  ? `${group.name ?? copy.noRubro} · ${copy.noRubro.toLowerCase()}`
                                  : `${group.name ?? copy.noRubro} · ${copy.grade}: ${Math.round(grade)}%${points.earned != null ? ` (${formatPoints(points.earned)} de ${formatPoints(points.max)} pts)` : ""}`;
                              return (
                                <span title={title}>
                                  <RubroTotalCell
                                    points={points.earned}
                                    max={points.max}
                                    grade={grade}
                                    view={markView}
                                    compact={dense}
                                  />
                                </span>
                              );
                            })()}
                          </td>
                        </Fragment>
                      ))}
                      <td className={cn("sticky right-0 z-20 min-w-[6rem] border-b border-l-2 border-l-foreground/25 bg-surface-muted px-2 text-center", rowY)}>
                        <span
                          title={sb.finalColumn}
                          className={cn(
                            "inline-block rounded-md px-2 py-0.5 text-sm font-bold leading-none tabular-nums",
                            final == null ? "text-foreground/65" : tonePillClass(final),
                          )}
                        >
                          {final == null ? "—" : `${final}${w.finalPercentSuffix}`}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              <tfoot>
                <tr className={dense ? "h-8" : "h-10"}>
                  <td className={cn("sticky bottom-0 left-0 z-40 border-r border-t border-border bg-surface-muted px-2", headY)} />
                  <td className={cn("sticky bottom-0 left-10 z-40 border-r border-t border-border bg-surface-muted px-3 text-xs font-bold uppercase tracking-wide text-foreground/50", headY)}>
                    {sb.classAverage}
                  </td>
                  {groups.map((group) => {
                    const gradeAvg = rubroAverageForVisible(group);
                    const pointsAvg = blockPointsAverageForVisible(group);
                    return (
                      <td
                        key={group.key}
                        colSpan={group.columns.length + 1}
                        title={
                          group.name
                            ? `${group.name} · ${copy.pesoTotalValue(group.peso ?? 0)}`
                            : copy.noRubro
                        }
                        className="sticky bottom-0 z-30 border-r border-t border-l-2 border-l-foreground/25 border-border bg-surface-muted px-1 py-1 text-center text-xs font-bold"
                      >
                        <div className="flex flex-wrap items-baseline justify-center gap-x-2 gap-y-0.5">
                          <span className="text-[9px] font-bold uppercase tracking-[0.1em] text-foreground/65">
                            {group.name ?? copy.noRubro}
                          </span>
                          <span
                            className={cn(
                              "inline-block rounded-md px-2 py-0.5 tabular-nums",
                              gradeAvg == null ? "text-foreground/65" : tonePillClass(gradeAvg),
                            )}
                          >
                            {gradeAvg == null ? "—" : `${gradeAvg}%`}
                          </span>
                          <span className="text-[9px] font-semibold text-foreground/65">
                            {copy.pesoTotalValue(group.peso ?? 0)}
                          </span>
                          {pointsAvg != null ? (
                            <span className="text-[9px] font-semibold tabular-nums text-foreground/65">
                              {sb.pointsAverage(formatPoints(pointsAvg))}
                            </span>
                          ) : null}
                        </div>
                      </td>
                    );
                  })}
                  <td className={cn("sticky bottom-0 right-0 z-40 min-w-[6rem] border-l-2 border-t border-l-foreground/25 border-border bg-surface-muted px-2 text-center text-xs font-bold", headY)}>
                    <div className="flex items-baseline justify-center gap-1.5">
                      <span className="whitespace-nowrap text-[9px] font-bold uppercase tracking-[0.1em] text-foreground/65">
                        {copy.average}
                      </span>
                      <span
                        className={cn(
                          "inline-block rounded-md px-2 py-0.5 tabular-nums",
                          overall == null ? "text-foreground/65" : tonePillClass(overall),
                        )}
                      >
                        {overall == null ? "—" : `${overall}%`}
                      </span>
                    </div>
                  </td>
                </tr>
              </tfoot>
            </table>
        </div>
      ) : null}

      {typeof document !== "undefined"
        ? createPortal(
            <AnimatePresence>
              {addOpen ? (
                <AddColumnDialog
                  key="add-column"
                  onCreate={handleCreate}
                  onClose={() => setAddOpen(false)}
                  titlesFor={titlesFor}
                  rubros={rubros}
                  defaultRubroId={
                    activeRubros.find((rubro) =>
                      exams.some((exam) => exam.rubroId === rubro.id),
                    )?.id ??
                    activeRubros[0]?.id ??
                    ""
                  }
                />
              ) : null}
              {rubricMode && subjectId ? (
                <RubricDialog
                  key="rubric-dialog"
                  mode={rubricMode}
                  subjectLabel={subjectName}
                  classId={classId}
                  subjectId={subjectId}
                  rubros={rubros}
                  columns={exams}
                  onClose={closeRubric}
                  onSaved={refresh}
                />
              ) : null}
            </AnimatePresence>,
            document.body,
          )
        : null}

      <ConfirmDialog
        open={closeTarget !== null}
        title={w.closeColumnConfirm}
        description={
          closeTarget
            ? labels.get(closeTarget.id)?.medium ?? closeTarget.title
            : undefined
        }
        confirmLabel={w.closeColumn}
        cancelLabel={t.gradebook.cancel}
        pending={closing}
        destructive={false}
        onConfirm={() => void handleCloseColumn()}
        onCancel={() => {
          if (!closing) setCloseTarget(null);
        }}
      />

      <ConfirmDialog
        open={rubroDeleteTarget !== null}
        title={copy.deleteRubroConfirm}
        description={rubroDeleteTarget?.name}
        confirmLabel={copy.delete}
        cancelLabel={t.gradebook.cancel}
        pending={rubroDeleteTarget != null && rubroBusy === rubroDeleteTarget.id}
        onConfirm={() => void handleDeleteRubro()}
        onCancel={() => {
          if (rubroBusy == null) setRubroDeleteTarget(null);
        }}
      />

      {/* Phone grade entry: one student at a time, same saveGrade action. */}
      <GradingSheet
        open={gradingStudentId != null}
        studentId={gradingStudentId ?? ""}
        studentName={
          students.find((student) => student.id === gradingStudentId)
            ? studentName(
                students.find((student) => student.id === gradingStudentId)!,
              )
            : ""
        }
        final={gradingStudentId ? finalForStudent(gradingStudentId) : null}
        columns={
          gradingStudentId
            ? orderedExams.map((column) => ({
                id: column.id,
                label: labels.get(column.id)?.medium ?? column.title,
                rubro: rubros.find((rubro) => rubro.id === column.rubroId)?.name ?? null,
                points: columnMaxPoints(column),
                mark: column.grades[gradingStudentId]?.mark ?? null,
                closed: Boolean(column.closedAt),
              }))
            : []
        }
        classId={classId}
        position={{
          index: Math.max(
            0,
            visibleStudents.findIndex((student) => student.id === gradingStudentId),
          ),
          total: visibleStudents.length,
        }}
        markView={markView}
        onClose={() => setGradingStudentId(null)}
        onPrev={() => {
          const index = visibleStudents.findIndex(
            (student) => student.id === gradingStudentId,
          );
          const previous = visibleStudents[index - 1];
          if (previous) setGradingStudentId(previous.id);
        }}
        onNext={() => {
          const index = visibleStudents.findIndex(
            (student) => student.id === gradingStudentId,
          );
          const next = visibleStudents[index + 1];
          if (next) setGradingStudentId(next.id);
        }}
        onSaved={() => void refresh()}
        onDeleteColumn={(columnId) => {
          const column = exams.find((item) => item.id === columnId);
          if (column) setDeleteTarget(column);
        }}
      />

      <EducationalSupportWorkflowDialog
        open={reviewStudent !== null}
        studentId={reviewStudent?.id ?? ""}
        classId={classId}
        subjectId={subjectId}
        subjectName={subjectName}
        studentName={reviewStudent?.name ?? ""}
        supports={reviewStudent?.supports ?? []}
        needsReview={localFlags[reviewStudent?.id ?? ""]?.needsReview ?? false}
        needsPeriodRegistration={
          localFlags[reviewStudent?.id ?? ""]?.needsPeriodRegistration ?? false
        }
        onClose={() => setReviewStudent(null)}
        onComplete={(patch) => {
          if (reviewStudent) patchSupportFlags(reviewStudent.id, patch);
        }}
      />
    </div>
  );
}

function GradeCell({
  classId,
  column,
  label,
  studentId,
  row,
  col,
  dense,
  markView,
  supportPending,
  onRequireReview,
  onSaved,
}: {
  classId: string;
  column: ExamColumn;
  label: string;
  studentId: string;
  row: number;
  col: number;
  dense: boolean;
  /** `points` shows the mark, `percent` the grade it represents. */
  markView: "points" | "percent";
  supportPending: boolean;
  onRequireReview: () => void;
  /** The saved mark (null = cleared), so the parent can patch one cell. */
  onSaved: (mark: number | null) => void;
}) {
  const t = useLiveT();
  const w = t.gradebook.workspace;
  const stored = column.grades[studentId];
  const initial = stored?.mark ?? null;
  const [text, setText] = useState(initial == null ? "" : String(initial));
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const dirty = useRef(false);

  const max = cellMax(column, studentId);
  const numeric = text.trim() === "" ? null : Number(text.replace(",", "."));
  const pct = pctOf(numeric, max);
  /*
    * Percent view: the cell reads `80%`. The draft stays in points, so the
    * blur commit writes exactly the number the teacher means, and the column
    * header keeps `10 pts` as its max.
    */
  const asPercent = markView === "percent";
  const displayText =
    asPercent && numeric != null && !Number.isNaN(numeric) && pct != null
      ? `${pct}%`
      : text;
  const cellTitle =
    stored?.status === "missing"
      ? w.gradeTooltipMissing(max)
      : numeric != null && pct != null
        ? w.gradeTooltip(numeric, max, pct)
        : w.gradeTooltipEmpty(max);

  async function commit() {
    if (!dirty.current) return;
    if (supportPending) {
      onRequireReview();
      return;
    }
    const mark = text.trim() === "" ? null : Number(text.replace(",", "."));
    if (mark != null && (Number.isNaN(mark) || mark < 0)) {
      setStatus("error");
      return;
    }

    /*
     * Optimistic: the cell already shows what the teacher typed, so the write
     * is an acknowledgement, not a gate. Only a refusal changes anything on
     * screen (an error border). This is why the parent refetch no longer runs
     * on every keystroke commit — waiting for it was the visible lag.
     */
    dirty.current = false;
    setStatus("saving");
    const res = await saveGrade({
      classId,
      assignmentId: column.id,
      studentId,
      mark,
      maxMarks: columnMaxPoints(column),
    });
    if (res.ok) {
      setStatus("idle");
      onSaved(mark);
    } else {
      dirty.current = true;
      setStatus("error");
    }
  }

  function focusCell(targetRow: number, targetCol: number) {
    const element = document.querySelector<HTMLInputElement>(
      `input[data-cell="${targetRow}:${targetCol}"]`,
    );
    element?.focus();
    element?.select();
  }

  return (
    <div className="relative">
      {/*
       * Percent view is read-only: marks are entered in points, so typing here
       * would have to be converted back and would blur the difference between
       * "the grade I see" and "the points I stored". Switching to Pts is the
       * way to edit; keyboard arrows still walk the grid.
       */}
      <input
        data-cell={`${row}:${col}`}
        value={displayText}
        readOnly={asPercent}
        inputMode="decimal"
        aria-label={`${label}. ${cellTitle}`}
        aria-readonly={asPercent}
        title={asPercent ? `${cellTitle} · ${t.gradebook.workspace.scoreboard.markViewReadOnly}` : cellTitle}
        onChange={(event) => {
          if (asPercent) return;
          setText(event.target.value);
          dirty.current = true;
          setStatus("idle");
        }}
        onFocus={(event) => event.currentTarget.select()}
        onBlur={() => {
          if (!asPercent) void commit();
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === "ArrowDown") {
            event.preventDefault();
            if (!asPercent) void commit();
            focusCell(row + 1, col);
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            if (!asPercent) void commit();
            focusCell(row - 1, col);
          }
        }}
        className={cn(
          "w-full rounded-md border border-transparent px-1 text-center font-semibold tabular-nums outline-none transition-colors focus:border-brand-400 focus:ring-2 focus:ring-brand-400/40",
          dense ? "h-7 min-w-[1.75rem] text-[13px]" : "h-8 min-w-[2.5rem] text-sm",
          asPercent && "cursor-default",
          status === "error"
            ? "border-error/60 text-error"
            : pct == null
              ? "text-foreground"
              : tintFor(pct),
        )}
      />
      {status === "saving" && !asPercent ? (
        <Loader2 className="absolute right-1 top-1.5 h-3 w-3 animate-spin text-foreground/40" />
      ) : null}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        // Compact on a phone (h-8, tighter padding and tracking) so the search
        // field and two chips share one row; roomier from landscape up.
        "h-8 shrink-0 whitespace-nowrap rounded-full border px-2.5 text-[11px] font-bold uppercase tracking-[0.04em] transition-colors",
        "[@media(orientation:landscape)]:h-9 [@media(orientation:landscape)]:px-3 [@media(orientation:landscape)]:text-xs [@media(orientation:landscape)]:tracking-wide",
        active
          ? "border-[#5b21b6] bg-[#e6defb] text-[#4c1d95] dark:border-[#b9a3f7] dark:bg-[#241b45] dark:text-[#c4b5fd]"
          : "border-border text-foreground/55 hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

/**
 * The sort control, sized to sit beside a search field and two chips on a
 * 390 px screen. Same listbox semantics as the shared menu, but the trigger
 * shows only the current value — the decorative chevron is dropped on phones
 * because the label is the affordance.
 */
function CompactSelect({
  value,
  onChange,
  options,
  ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  ariaLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const current = options.find((option) => option.value === value) ?? options[0];

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen((state) => !state)}
        className="inline-flex h-8 max-w-[7.5rem] items-center gap-1 rounded-full border border-border px-2.5 text-[11px] font-bold uppercase tracking-[0.04em] text-foreground/60 transition-colors [@media(orientation:landscape)]:h-9 [@media(orientation:landscape)]:max-w-none [@media(orientation:landscape)]:gap-1.5 [@media(orientation:landscape)]:px-3 [@media(orientation:landscape)]:text-xs [@media(orientation:landscape)]:tracking-wide"
      >
        <span className="truncate">{current?.label}</span>
        <ChevronDown className="h-3 w-3 shrink-0 opacity-60" />
      </button>
      {open ? (
        <>
          <button
            type="button"
            aria-hidden
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-30 cursor-default"
          />
          <ul
            role="listbox"
            aria-label={ariaLabel}
            className="absolute left-0 top-full z-40 mt-1.5 w-56 rounded-xl border border-border bg-surface-elevated p-1 shadow-[0_12px_32px_-8px_rgb(16_32_29/0.24)]"
          >
            {options.map((option) => (
              <li key={option.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={option.value === value}
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center rounded-lg px-2.5 py-2 text-left text-[13px] transition-colors",
                    option.value === value
                      ? "bg-[#0891B2]/10 font-semibold text-[#0e7490] dark:text-[#22d3ee]"
                      : "font-medium text-foreground/75 hover:bg-surface-muted",
                  )}
                >
                  {option.label}
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}

function ColumnHeader({
  column,
  label,
  density,
  pointsEditable,
  onDelete,
  onClose,
  onRename,
  onRenamePoints,
}: {
  column: ExamColumn;
  label: { short: string; medium: string; full: string };
  density: Density;
  /** Points can only change before the first grade (see `updateExamColumn`). */
  pointsEditable: boolean;
  onDelete: () => void;
  onClose?: () => void;
  onRename: (title: string) => Promise<boolean>;
  onRenamePoints: (points: number | null) => Promise<boolean>;
}) {
  const t = useLiveT();
  const w = t.gradebook.workspace;
  const compact = density === "compact";

  const [editing, setEditing] = useState<"title" | "points" | null>(null);
  const [draft, setDraft] = useState(column.title);
  const [pointsDraft, setPointsDraft] = useState(String(columnMaxPoints(column)));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);
  const pointsRef = useRef<HTMLInputElement>(null);

  const maxPts = columnMaxPoints(column);
  const display = compact ? label.short : density === "cozy" ? label.medium : label.full;

  useEffect(() => {
    if (editing === "title") {
      titleRef.current?.focus();
      titleRef.current?.select();
    } else if (editing === "points") {
      pointsRef.current?.focus();
      pointsRef.current?.select();
    }
  }, [editing]);

  function startEditing(field: "title" | "points") {
    setError(false);
    if (field === "title") {
      setDraft(column.title || label.medium);
    } else {
      if (!pointsEditable) return;
      setPointsDraft(String(maxPts));
    }
    setEditing(field);
  }

  async function commitTitle() {
    if (saving) return;
    const next = draft.trim();
    setEditing(null);
    if (!next || next === column.title) return;
    setSaving(true);
    const ok = await onRename(next);
    setSaving(false);
    if (!ok) setError(true);
  }

  async function commitPoints() {
    if (saving) return;
    const raw = pointsDraft.trim();
    const next = raw === "" ? null : Number(raw.replace(",", "."));
    if (next != null && (!Number.isFinite(next) || next <= 0 || next > 1000)) {
      setError(true);
      return;
    }
    setEditing(null);
    if (next === column.points || (next == null && column.points == null)) return;
    setSaving(true);
    const ok = await onRenamePoints(next);
    setSaving(false);
    if (!ok) setError(true);
  }

  const titleClass = cn(
    "w-full min-w-0 rounded-md px-1 text-center font-bold leading-tight transition-colors",
    compact ? "text-[10px] uppercase tracking-wide" : "text-[11px]",
  );

  return (
    <div className="group/col flex h-full w-full flex-col items-center justify-center gap-0.5 py-0.5">
      {editing === "title" ? (
        <input
          ref={titleRef}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={() => void commitTitle()}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void commitTitle();
            } else if (event.key === "Escape") {
              event.preventDefault();
              setDraft(column.title);
              setEditing(null);
            }
          }}
          maxLength={120}
          disabled={saving}
          aria-label={w.renameColumn}
          placeholder={w.renameColumnPlaceholder}
          className={cn(
            titleClass,
            "border-0 bg-background text-foreground caret-brand-600 outline-none ring-2 ring-brand-400/50 placeholder:font-medium placeholder:text-foreground/35 disabled:opacity-60",
          )}
        />
      ) : (
        <button
          type="button"
          onClick={() => startEditing("title")}
          disabled={saving}
          title={`${label.medium} · ${w.renameColumnHint}`}
          aria-label={`${label.medium} · ${w.renameColumn}`}
          className={cn(
            titleClass,
            "cursor-text truncate whitespace-nowrap text-foreground/70 hover:bg-surface-muted hover:text-foreground hover:ring-1 hover:ring-brand-400/40 focus-visible:bg-surface-muted focus-visible:text-foreground focus-visible:outline-none",
            error && "text-error",
          )}
        >
          {display}
        </button>
      )}

      {editing === "points" ? (
        <input
          ref={pointsRef}
          value={pointsDraft}
          onChange={(event) => setPointsDraft(event.target.value.replace(/[^\d]/g, ""))}
          onBlur={() => void commitPoints()}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void commitPoints();
            } else if (event.key === "Escape") {
              event.preventDefault();
              setPointsDraft(String(maxPts));
              setEditing(null);
            }
          }}
          inputMode="numeric"
          maxLength={4}
          disabled={saving}
          aria-label={w.columnPoints}
          className="w-12 rounded-md border-0 bg-background px-1 text-center text-[9px] font-semibold tabular-nums text-foreground outline-none ring-2 ring-brand-400/50"
        />
      ) : (
        <button
          type="button"
          onClick={() => startEditing("points")}
          disabled={!pointsEditable || saving}
          title={pointsEditable ? w.columnPointsEdit : w.columnPointsLocked}
          aria-label={`${w.columnPointsShort(maxPts)} · ${w.columnPoints}`}
          className={cn(
            "rounded px-1 text-[9px] font-semibold tabular-nums text-foreground/65",
            pointsEditable
              ? "cursor-text hover:bg-surface-muted hover:text-foreground hover:ring-1 hover:ring-brand-400/40"
              : "cursor-default",
          )}
        >
          {w.columnPointsShort(maxPts)}
        </button>
      )}

      {/* Fixed-height slots keep every column header on the same baseline: a
          closed tag, a spinner or the hover actions never lift the title. */}
      <span
        className={cn(
          "flex h-3 items-center justify-center text-[9px] font-semibold uppercase tracking-wide",
          column.closedAt ? "text-foreground/65" : "invisible",
        )}
        aria-hidden={!column.closedAt}
      >
        {column.closedAt ? w.closedColumn : w.closedColumn}
      </span>

      <div className="flex h-8 items-center justify-center">
        {saving ? (
          <Loader2 className="h-3 w-3 animate-spin text-foreground/40" />
        ) : (
          <div
            className={cn(
              "flex items-center justify-center gap-0.5 transition-opacity",
              COLUMN_ACTIONS_VISIBILITY,
            )}
          >
            {onClose ? (
              <button
                type="button"
                onClick={onClose}
                aria-label={w.closeColumn}
                title={w.closeColumn}
                // 32px hit area (Apple HIG minimum for touch) with no double-tap zoom.
                className="flex h-8 w-8 touch-manipulation select-none items-center justify-center rounded-md text-foreground/60 [-webkit-touch-callout:none] hover:bg-surface-muted hover:text-foreground active:bg-surface-muted"
              >
                <Lock className="h-4 w-4" />
              </button>
            ) : null}
            <button
              type="button"
              onClick={onDelete}
              aria-label={w.deleteColumn}
              title={w.deleteColumn}
              className="flex h-8 w-8 touch-manipulation select-none items-center justify-center rounded-md text-error/80 [-webkit-touch-callout:none] hover:bg-error/10 hover:text-error active:bg-error/10"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function AddColumnDialog({
  onCreate,
  onClose,
  titlesFor,
  rubros,
  defaultRubroId,
}: {
  onCreate: (
    titles: string[],
    points: number | null,
    kind: AssignmentKind,
    rubroId: string,
  ) => Promise<boolean>;
  onClose: () => void;
  /** Sequenced titles for the first `count` columns of a rubro. */
  titlesFor: (rubroId: string, count: number) => string[];
  rubros: GradeRubro[];
  defaultRubroId: string;
}) {
  const t = useLiveT();
  const w = t.gradebook.workspace;
  const copy = w.rubros;
  const [points, setPoints] = useState("100");
  const [count, setCount] = useState(1);
  const [rubroId, setRubroId] = useState(defaultRubroId);
  const [pending, setPending] = useState(false);

  // The type is not a choice: it follows the rubro ("Tareas" → Tarea).
  const kind = kindForRubro(
    rubros.find((rubro) => rubro.id === rubroId)?.name ?? "",
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!rubroId) return;
    setPending(true);
    const parsed = points.trim() === "" ? null : Number(points.replace(",", "."));
    const ok = await onCreate(
      titlesFor(rubroId, count),
      parsed == null || Number.isNaN(parsed) ? null : parsed,
      kind,
      rubroId,
    );
    setPending(false);
    if (ok) onClose();
  }

  // Categories come from the rubric the teacher saved. Archived rubros are not
  // selectable (they would create a hidden column).
  const options = rubros
    .filter((rubro) => !rubro.archived)
    .map((rubro) => ({
      value: rubro.id,
      label: `${rubro.name} · ${rubro.peso}%`,
    }));

  return (
    <Dialog
      open
      title={w.addColumn}
      onClose={onClose}
      panelClassName="max-w-md"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 items-center justify-center rounded-xl border border-border px-4 text-sm font-semibold text-foreground/70 ui-hover"
          >
            {t.gradebook.cancel}
          </button>
          <button
            type="submit"
            form="add-column-form"
            disabled={pending || !rubroId}
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-700 active:scale-[0.98] disabled:opacity-50"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {w.create}
          </button>
        </>
      }
    >
      <form id="add-column-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-foreground/70">{copy.columnRubro}</span>
          <Dropdown
            value={rubroId}
            onChange={setRubroId}
            options={options}
            ariaLabel={copy.columnRubro}
            size="form"
            placeholder={copy.noRubros}
          />
          <span className="text-xs font-medium text-foreground/50">{copy.columnRubroHint}</span>
        </div>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-foreground/70">{w.columnPoints}</span>
          <input
            autoFocus
            value={points}
            onChange={(event) => setPoints(event.target.value)}
            inputMode="numeric"
            className="h-10 rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 dark:focus:ring-brand-950"
          />
          <span className="text-xs font-medium text-foreground/50">{w.columnPointsHint}</span>
        </label>
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-foreground/70">{w.columnCount}</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCount((current) => Math.max(1, current - 1))}
              disabled={count <= 1}
              aria-label={w.columnCountless}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-border text-foreground/70 transition-colors hover:border-brand-300 hover:text-foreground active:scale-95 disabled:opacity-40 disabled:hover:border-border"
            >
              <Minus className="h-4 w-4" />
            </button>
            <input
              value={count}
              onChange={(event) => {
                const next = Number(event.target.value.replace(/[^0-9]/g, ""));
                setCount(next >= 1 ? Math.min(MAX_NEW_COLUMNS, next) : 1);
              }}
              onBlur={() => {
                if (!count || count < 1) setCount(1);
              }}
              inputMode="numeric"
              aria-label={w.columnCount}
              className="h-10 w-14 rounded-xl border border-border bg-background px-2 text-center text-sm font-semibold tabular-nums text-foreground outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 dark:focus:ring-brand-950"
            />
            <button
              type="button"
              onClick={() =>
                setCount((current) => Math.min(MAX_NEW_COLUMNS, current + 1))
              }
              disabled={count >= MAX_NEW_COLUMNS}
              aria-label={w.columnCountMore}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-border text-foreground/70 transition-colors hover:border-brand-300 hover:text-foreground active:scale-95 disabled:opacity-40 disabled:hover:border-border"
            >
              <Plus className="h-4 w-4" />
            </button>
            <span className="text-xs font-medium text-foreground/50">
              {w.columnCountHint}
            </span>
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-foreground/70">{w.columnKind}</span>
          <p className="text-xs font-medium text-foreground/50">
            {w.columnKindFromRubro(w.kinds[kind])}
          </p>
          <p className="text-xs text-foreground/50">
            {titlesFor(rubroId, count).join(" · ")}
          </p>
        </div>
      </form>
    </Dialog>
  );
}
