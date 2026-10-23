"use client";

import { Fragment, useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import {
  Check,
  Download,
  Loader2,
  Lock,
  Maximize2,
  Minimize2,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
  Undo2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/client";
import { hubToneSegment, SEGMENT_TRACK } from "@/lib/dashboard/tones";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EducationalSupportBadgeButton } from "@/components/educational-supports/support-badge-button";
import { EducationalSupportWorkflowDialog } from "@/components/educational-supports/support-workflow-dialog";
import { SubmitReport } from "@/components/grades/submit-report";
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
  addExamColumn,
  closeExamColumn,
  fetchSubjectExams,
  removeExamColumn,
  restoreExamColumn,
  saveGrade,
} from "@/lib/teachers/exams-actions";
import type { AssignmentKind, ExamColumn, GradeRubro } from "@/lib/dashboard/exams";
import type { ClassOption } from "@/lib/dashboard/gradebook";
import type { TeacherStudent } from "@/lib/dashboard/grupos";
import {
  rubroPercentForStudent,
  studentFinal,
  totalPeso,
} from "@/lib/dashboard/grade-weights";
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
const ACCENT_TEXT = "text-[#7c3aed] dark:text-[#b9a3f7]";

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

function average(values: (number | null)[]): number | null {
  const nums = values.filter((value): value is number => value != null);
  if (nums.length === 0) return null;
  return Math.round(nums.reduce((sum, value) => sum + value, 0) / nums.length);
}

function studentAverage(exams: ExamColumn[], studentId: string): number | null {
  return average(exams.map((column) => columnPct(column, studentId)));
}



/* Grade tints — the same palette the marketing site shows for the gradebook
   (see weeon-marketing/docs/design-tokens.md). Solid enough to read as pills. */
const TINT_PASS = "bg-[#abe3dc] text-[#0f4c47] dark:bg-[#0f2f2c] dark:text-[#6ee7d7]";
const TINT_WARN = "bg-[#fdeecd] text-[#92400e] dark:bg-[#3a2a12] dark:text-[#fde68a]";
const TINT_FAIL = "bg-[#fbdee7] text-[#9f1239] dark:bg-[#3a1622] dark:text-[#fda4af]";
/** FINAL column is always the purple tone, regardless of the value. */
const TINT_FINAL = "bg-[#e6defb] text-[#4c1d95] dark:bg-[#241b45] dark:text-[#c4b5fd]";

function tintFor(pct: number | null): string {
  if (pct == null) return "";
  if (pct >= PASS) return TINT_PASS;
  if (pct >= 50) return TINT_WARN;
  return TINT_FAIL;
}

/** Consecutive columns sharing one rubro. */
type RubroGroup = {
  key: string;
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
    const key = column.rubroId ?? "__none";
    const last = groups[groups.length - 1];
    if (last && last.key === key) {
      last.columns.push(column);
    } else {
      groups.push({
        key,
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
  const t = useT();
  const w = t.gradebook.workspace;
  const copy = w.rubros;
  const [subjectId, setSubjectId] = useState(initialSubjectId);
  const [exams, setExams] = useState<ExamColumn[]>(initialExams);
  const [rubros, setRubros] = useState<GradeRubro[]>(initialRubros);
  const [rubricMode, setRubricMode] = useState<"wizard" | "edit" | null>(null);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [density, setDensity] = useState<Density>("cozy");
  const dense = density === "compact";
  const [error, setError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ExamColumn | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [closeTarget, setCloseTarget] = useState<ExamColumn | null>(null);
  const [closing, setClosing] = useState(false);
  const [undoColumn, setUndoColumn] = useState<ExamColumn | null>(null);
  const [localFlags, setLocalFlags] = useState(supportFlags);
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
  // One narrow subtotal column closes every rubro group.
  const subtotalWidth = dense ? "w-[2.5rem]" : "w-[3.25rem]";
  const colTop = dense ? "top-8" : "top-9";
  const colHeadH = dense ? "h-8" : "h-10";

  const visibleStudents = students.filter((student) =>
    studentName(student).toLowerCase().includes(query.trim().toLowerCase()),
  );

  // Columns are displayed grouped by rubro (weight order), then by kind inside
  // the rubro, so each weighted header is one contiguous block.
  const rubroById = new Map(rubros.map((rubro) => [rubro.id, rubro]));
  const orderedExams = [...exams]
    .filter((column) => {
      const rubro = column.rubroId ? rubroById.get(column.rubroId) : null;
      return !rubro?.archived;
    })
    .sort((a, b) => {
      const pa = a.rubroId ? (rubroById.get(a.rubroId)?.position ?? 999) : 999;
      const pb = b.rubroId ? (rubroById.get(b.rubroId)?.position ?? 999) : 999;
      if (pa !== pb) return pa - pb;
      return KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind);
    });

  // Auto label per column: short code + sequence among that type (CW 1) for the
  // compact view, and the full kind name (Classwork 1) for the expanded view.
  const labels = new Map<
    string,
    { short: string; medium: string; full: string }
  >();
  const counters = new Map<AssignmentKind, number>();
  for (const column of orderedExams) {
    const next = (counters.get(column.kind) ?? 0) + 1;
    counters.set(column.kind, next);
    labels.set(column.id, {
      short: `${w.kindShort[column.kind]} ${next}`,
      medium: `${w.kindMedium[column.kind]} ${next}`,
      full: `${w.kinds[column.kind]} ${next}`,
    });
  }

  const groups = buildRubroGroups(orderedExams, rubros);
  const activeRubros = rubros.filter((rubro) => !rubro.archived);
  const orderedIndex = new Map(orderedExams.map((column, index) => [column.id, index]));
  const pesoTotal = totalPeso(rubros);
  // Weights must add up to 100 %; reopening the editor is the fix.
  const pesoIncomplete = activeRubros.length > 0 && pesoTotal !== 100;
  // Weighted only when the rubric exists and at least one column is assigned.
  const weighted = activeRubros.length > 0 && orderedExams.some((c) => c.rubroId);

  /** Auto title for a new column: type + its sequence among that type. */
  function nextTitleFor(kind: AssignmentKind): string {
    const count = exams.filter((column) => column.kind === kind).length;
    return `${w.kinds[kind]} ${count + 1}`;
  }

  function finalForStudent(studentId: string): number | null {
    if (!weighted) return studentAverage(exams, studentId);
    const percent = studentFinal(rubros, exams, studentId).percent;
    // FINAL is always a whole percentage in the matrix and CSV.
    return percent == null ? null : Math.round(percent);
  }

  function groupAverageForVisible(group: RubroGroup): number | null {
    if (!group.rubroId || !weighted) return null;
    return average(
      visibleStudents.map((student) =>
        rubroPercentForStudent(exams, group.rubroId!, student.id),
      ),
    );
  }

  /**
   * This student's contribution of one rubro to the final: rubro % × peso.
   * Capped by construction at the rubro's peso (Tareas 30 → max 30). Kept to
   * one decimal so the three subtotals add up to the FIN.
   */
  function rubroTotalForStudent(group: RubroGroup, studentId: string): number | null {
    if (!group.rubroId || !weighted) return null;
    const percent = rubroPercentForStudent(exams, group.rubroId, studentId);
    if (percent == null) return null;
    const peso = group.peso ?? 0;
    return Math.round((percent * peso) / 10) / 10;
  }

  function rubroPercentForGroupStudent(
    group: RubroGroup,
    studentId: string,
  ): number | null {
    if (!group.rubroId || !weighted) return null;
    return rubroPercentForStudent(exams, group.rubroId, studentId);
  }

  const overall = (() => {
    if (!weighted) {
      return average(
        visibleStudents.flatMap((student) =>
          exams.map((column) => columnPct(column, student.id)),
        ),
      );
    }
    let sum = 0;
    let weight = 0;
    for (const group of groups) {
      const avg = groupAverageForVisible(group);
      if (avg == null || group.peso == null) continue;
      sum += avg * group.peso;
      weight += group.peso;
    }
    return weight > 0 ? Math.round(sum / weight) : null;
  })();

  async function changeSubject(nextId: string | null) {
    setSubjectId(nextId);
    setError(null);
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

  async function handleCreate(
    title: string,
    points: number | null,
    kind: AssignmentKind,
    rubroId: string,
  ) {
    setError(null);
    const res = await addExamColumn({
      classId,
      title,
      points,
      subjectId,
      kind,
      rubroId,
    });
    if (!res.ok) {
      setError(res.error);
      return false;
    }
    await refresh();
    return true;
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const column = deleteTarget;
    const res = await removeExamColumn({ classId, assignmentId: column.id });
    setDeleting(false);
    setDeleteTarget(null);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setUndoColumn(column);
    setExams((current) => current.filter((item) => item.id !== column.id));
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

  // The undo toast disappears on its own after 30 seconds.
  useEffect(() => {
    if (!undoColumn) return;
    const timer = window.setTimeout(() => setUndoColumn(null), 30_000);
    return () => window.clearTimeout(timer);
  }, [undoColumn]);

  async function handleUndo() {
    if (!undoColumn) return;
    const column = undoColumn;
    const grades = students
      .map((student) => {
        const grade = column.grades[student.id];
        return grade
          ? { studentId: student.id, mark: grade.mark, maxMarks: grade.maxMarks }
          : null;
      })
      .filter((value): value is { studentId: string; mark: number; maxMarks: number } => value !== null);
    const res = await restoreExamColumn({
      classId,
      assignmentId: column.id,
      title: column.title,
      points: column.points,
      rubroId: column.rubroId,
      grades,
    });
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setUndoColumn(null);
    await refresh();
  }

  function exportCsv() {
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
      `${w.final} ${w.finalPercentSuffix}`.trim(),
    ];
    const rubroHeader = [t.gradebook.headers.student, ...rubroRow, ""];
    const rows = visibleStudents.map((student) => {
      const finalPct = finalForStudent(student.id);
      return [
        studentName(student),
        ...orderedExams.map((column) => {
          const grade = column.grades[student.id];
          if (!grade) return "";
          const max = cellMax(column, student.id);
          return `${grade.mark}/${max}`;
        }),
        finalPct == null ? "" : `${Math.round(finalPct)}${w.finalPercentSuffix}`,
      ];
    });
    const csv = [rubroHeader, header, ...rows]
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
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col">
          <h1 className="brand-page-title text-3xl font-bold text-foreground sm:text-4xl">
            {groupName}
          </h1>
          {subjectName ? (
            <p className="mt-0.5 text-sm font-medium text-foreground/55">{subjectName}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {subjectId ? (
            <button
              type="button"
              onClick={() => void openRubric(activeRubros.length === 0 ? "wizard" : "edit")}
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border px-3.5 text-sm font-semibold text-foreground/70 ui-hover"
            >
              <SlidersHorizontal className="h-4 w-4" />
              {copy.edit}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() =>
              setDensity(
                DENSITY_ORDER[(DENSITY_ORDER.indexOf(density) + 1) % DENSITY_ORDER.length],
              )
            }
            title={w.density}
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border px-3.5 text-sm font-semibold text-foreground/70 ui-hover"
          >
            {density === "expanded" ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
            {density === "compact" ? w.dense : density === "cozy" ? w.cozy : w.expanded}
          </button>
          <button
            type="button"
            onClick={exportCsv}
            disabled={exams.length === 0}
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border px-3.5 text-sm font-semibold text-foreground/70 ui-hover disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            {w.export}
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

      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="relative inline-flex items-center">
          <Search className="pointer-events-none absolute left-3 h-4 w-4 text-foreground/40" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={w.search}
            className="h-9 w-60 rounded-full border border-border bg-background pl-9 pr-3 text-sm text-foreground outline-none focus:border-brand-400"
          />
        </label>
        <div className="flex items-center gap-3 text-xs font-semibold">
          <span className="flex items-center gap-1.5 text-foreground/50">
            <span className="h-2.5 w-2.5 rounded-full bg-[#abe3dc] ring-1 ring-[#7dd3c7]" />
            ≥ {PASS}%
          </span>
          <span className="flex items-center gap-1.5 text-foreground/50">
            <span className="h-2.5 w-2.5 rounded-full bg-[#fdeecd] ring-1 ring-[#f5d88a]" />
            50–69%
          </span>
          <span className="flex items-center gap-1.5 text-foreground/50">
            <span className="h-2.5 w-2.5 rounded-full bg-[#fbdee7] ring-1 ring-[#f0b8c8]" /> &lt; 50%
          </span>
        </div>
      </div>

      {pesoIncomplete && !rubricMode ? (
        <button
          type="button"
          onClick={() => void openRubric("edit")}
          className="flex items-center justify-between gap-3 rounded-xl border border-[#f5d88a] bg-[#fdeecd] px-4 py-2.5 text-left text-sm font-semibold text-[#92400e] dark:border-[#5b4318] dark:bg-[#3a2a12] dark:text-[#fde68a]"
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

      {undoColumn ? (
        <div className="fixed bottom-5 right-5 z-[90] flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm shadow-lg">
          <button
            type="button"
            onClick={() => void handleUndo()}
            className="inline-flex items-center gap-1.5 font-semibold text-[#7c3aed] transition-colors hover:opacity-80 dark:text-[#b9a3f7]"
          >
            <Undo2 className="h-4 w-4" />
            {t.gradebook.undo}
          </button>
          <button
            type="button"
            onClick={() => setUndoColumn(null)}
            aria-label={t.common.close}
            className="flex h-6 w-6 items-center justify-center rounded text-foreground/45 hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
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
      ) : (
        <div className="relative min-w-0 overflow-auto rounded-2xl border border-border bg-surface">
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
                  {groups.map((group) => (
                    <th
                      key={group.key}
                      colSpan={group.columns.length + 1}
                      className={cn(
                        "sticky top-0 z-40 border-b border-l-2 border-foreground/25 bg-surface-muted px-2 text-center leading-none",
                        dense ? "h-8" : "h-9",
                      )}
                    >
                      {group.name ? (
                        <span className="inline-flex items-center gap-1.5">
                          <span className="max-w-[10rem] truncate text-[10px] font-bold uppercase tracking-[0.12em] text-foreground/65">
                            {group.name}
                          </span>
                          <span className="rounded bg-[#e6defb] px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-[#4c1d95] dark:bg-[#241b45] dark:text-[#c4b5fd]">
                            {group.peso ?? 0}%
                          </span>
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-foreground/45">
                          {copy.noRubro}
                        </span>
                      )}
                    </th>
                  ))}
                  <th
                    rowSpan={2}
                    className={cn(
                      "sticky right-0 top-0 z-50 w-[4.5rem] border-b border-l-2 border-l-foreground/25 bg-surface px-1 text-center align-middle",
                      headY,
                    )}
                  >
                    <div className="flex flex-col items-center gap-0.5 py-1">
                      <span className={cn("text-xs font-bold uppercase tracking-wide", ACCENT_TEXT)}>
                        {w.final}
                      </span>
                      <span className="text-[9px] font-semibold tabular-nums text-foreground/45">
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
                              onDelete={() => setDeleteTarget(column)}
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
                      >
                        <span className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#7c3aed] dark:text-[#b9a3f7]">
                          {copy.subtotal}
                        </span>
                      </th>
                    </Fragment>
                  ))}
                </tr>
              </thead>

              <tbody>
                {visibleStudents.map((student, rowIndex) => {
                  const final = finalForStudent(student.id);
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
                            className="font-medium leading-tight text-foreground transition-colors hover:text-[#7c3aed] dark:hover:text-[#b9a3f7]"
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
                                  supportPending={supportActionPending({
                                    needsReview: localFlags[student.id]?.needsReview ?? false,
                                    needsPeriodRegistration:
                                      localFlags[student.id]?.needsPeriodRegistration ?? false,
                                  })}
                                  onRequireReview={() => void openSupportReview(student)}
                                  onSaved={refresh}
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
                              const total = rubroTotalForStudent(group, student.id);
                              const pct = rubroPercentForGroupStudent(group, student.id);
                              const title =
                                pct == null || group.peso == null || total == null
                                  ? `${group.name ?? copy.noRubro} · ${copy.grade}`
                                  : `${group.name ?? copy.noRubro}: ${Math.round(pct)}% × ${group.peso}% = ${total.toFixed(1)}%`;
                              return (
                                <span
                                  title={title}
                                  className={cn(
                                    "inline-block rounded-md px-1.5 py-0.5 text-xs font-bold tabular-nums",
                                    total == null ? "text-foreground/35" : TINT_FINAL,
                                  )}
                                >
                                  {total == null ? "—" : `${total.toFixed(1)}${w.finalPercentSuffix}`}
                                </span>
                              );
                            })()}
                          </td>
                        </Fragment>
                      ))}
                      <td className={cn("sticky right-0 z-20 w-[4.5rem] border-b border-l-2 border-l-foreground/25 bg-surface px-2 text-center", rowY)}>
                        <span className={cn("inline-block rounded-md px-2 py-0.5 text-sm font-bold leading-none tabular-nums", final == null ? "text-foreground/40" : TINT_FINAL)}>
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
                    {weighted ? copy.grade : w.columnAverage}
                  </td>
                  {groups.map((group) => {
                    const avg = groupAverageForVisible(group);
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
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="max-w-full truncate text-[9px] font-bold uppercase tracking-[0.1em] text-foreground/45">
                            {group.name ?? copy.noRubro}
                          </span>
                          <span className={cn("inline-block rounded-md px-2 py-0.5 font-bold tabular-nums", avg == null ? "text-foreground/40" : TINT_FINAL)}>
                            {avg == null ? "—" : `${avg}${w.finalPercentSuffix}`}
                          </span>
                        </div>
                      </td>
                    );
                  })}
                  <td className={cn("sticky bottom-0 right-0 z-40 w-[4.5rem] border-l-2 border-t border-l-foreground/25 border-border bg-surface-muted px-2 text-center text-xs font-bold", headY)}>
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="text-[9px] font-bold uppercase tracking-[0.1em] text-foreground/45">
                        {copy.average}
                      </span>
                      <span className={cn("inline-block rounded-md px-2 py-0.5 tabular-nums", overall == null ? "text-foreground/40" : TINT_FINAL)}>
                        {overall == null ? "—" : `${overall}${w.finalPercentSuffix}`}
                      </span>
                    </div>
                  </td>
                </tr>
              </tfoot>
            </table>
        </div>
      )}

      {typeof document !== "undefined"
        ? createPortal(
            <AnimatePresence>
              {addOpen ? (
                <AddColumnDialog
                  key="add-column"
                  onCreate={handleCreate}
                  onClose={() => setAddOpen(false)}
                  titleFor={nextTitleFor}
                  rubros={activeRubros}
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
        open={deleteTarget !== null}
        title={w.deleteColumnConfirm}
        description={
          deleteTarget
            ? labels.get(deleteTarget.id)?.medium ?? deleteTarget.title
            : undefined
        }
        confirmLabel={t.gradebook.delete}
        cancelLabel={t.gradebook.cancel}
        pending={deleting}
        onConfirm={() => void handleDelete()}
        onCancel={() => {
          if (!deleting) setDeleteTarget(null);
        }}
      />

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
        onConfirm={() => void handleCloseColumn()}
        onCancel={() => {
          if (!closing) setCloseTarget(null);
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
  supportPending: boolean;
  onRequireReview: () => void;
  onSaved: () => void;
}) {
  const t = useT();
  const w = t.gradebook.workspace;
  const stored = column.grades[studentId];
  const initial = stored?.mark ?? null;
  const [text, setText] = useState(initial == null ? "" : String(initial));
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const dirty = useRef(false);

  const max = cellMax(column, studentId);
  const numeric = text.trim() === "" ? null : Number(text.replace(",", "."));
  const pct = pctOf(numeric, max);
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
    setStatus("saving");
    const res = await saveGrade({ classId, assignmentId: column.id, studentId, mark });
    setStatus(res.ok ? "idle" : "error");
    if (res.ok) {
      dirty.current = false;
      onSaved();
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
      <input
        data-cell={`${row}:${col}`}
        value={text}
        inputMode="decimal"
        aria-label={`${label}. ${cellTitle}`}
        title={cellTitle}
        onChange={(event) => {
          setText(event.target.value);
          dirty.current = true;
          setStatus("idle");
        }}
        onFocus={(event) => event.currentTarget.select()}
        onBlur={() => void commit()}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === "ArrowDown") {
            event.preventDefault();
            void commit();
            focusCell(row + 1, col);
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            void commit();
            focusCell(row - 1, col);
          }
        }}
        className={cn(
          "w-full rounded-md border border-transparent px-1 text-center font-semibold tabular-nums outline-none transition-colors focus:border-brand-400 focus:ring-2 focus:ring-brand-400/40",
          dense ? "h-7 min-w-[1.75rem] text-[13px]" : "h-8 min-w-[2.5rem] text-sm",
          status === "error"
            ? "border-error/60 text-error"
            : pct == null
              ? "text-foreground"
              : tintFor(pct),
        )}
      />
      {status === "saving" ? (
        <Loader2 className="absolute right-1 top-1.5 h-3 w-3 animate-spin text-foreground/40" />
      ) : null}
    </div>
  );
}

function ColumnHeader({
  column,
  label,
  density,
  onDelete,
  onClose,
}: {
  column: ExamColumn;
  label: { short: string; medium: string; full: string };
  density: Density;
  onDelete: () => void;
  onClose?: () => void;
}) {
  const t = useT();
  const w = t.gradebook.workspace;
  const compact = density === "compact";
  const maxPts = columnMaxPoints(column);

  return (
    <div className="group/col relative flex w-full flex-col items-center gap-0.5">
      <span
        title={`${label.medium} · ${w.columnPointsShort(maxPts)}`}
        className={cn(
          "max-w-full whitespace-nowrap px-1 text-center font-bold leading-tight text-foreground/55",
          compact ? "text-[10px] uppercase tracking-wide" : "text-[11px]",
        )}
      >
        {compact ? label.short : density === "cozy" ? label.medium : label.full}
      </span>
      <span className="text-[9px] font-semibold tabular-nums text-foreground/45">
        {w.columnPointsShort(maxPts)}
      </span>
      {column.closedAt ? (
        <span className="text-[9px] font-semibold uppercase tracking-wide text-foreground/45">
          {w.closedColumn}
        </span>
      ) : null}
      {onClose ? (
        <button
          type="button"
          onClick={onClose}
          aria-label={w.closeColumn}
          title={w.closeColumn}
          className="absolute left-0 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded text-foreground/50 opacity-0 transition-all hover:bg-surface-muted hover:text-foreground focus:opacity-100 group-hover/col:opacity-100"
        >
          <Lock className="h-3 w-3" />
        </button>
      ) : null}
      <button
        type="button"
        onClick={onDelete}
        aria-label={w.deleteColumn}
        title={w.deleteColumn}
        className="absolute right-0 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded text-error/60 opacity-0 transition-all hover:bg-error/10 hover:text-error focus:opacity-100 group-hover/col:opacity-100"
      >
        <Trash2 className="h-3 w-3" />
      </button>
    </div>
  );
}

function AddColumnDialog({
  onCreate,
  onClose,
  titleFor,
  rubros,
  defaultRubroId,
}: {
  onCreate: (
    title: string,
    points: number | null,
    kind: AssignmentKind,
    rubroId: string,
  ) => Promise<boolean>;
  onClose: () => void;
  titleFor: (kind: AssignmentKind) => string;
  rubros: GradeRubro[];
  defaultRubroId: string;
}) {
  const t = useT();
  const w = t.gradebook.workspace;
  const copy = w.rubros;
  const kinds: AssignmentKind[] = ["homework", "exam", "quiz", "classwork", "project"];
  const [points, setPoints] = useState("100");
  const [kind, setKind] = useState<AssignmentKind>("homework");
  const [rubroId, setRubroId] = useState(defaultRubroId);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!rubroId) return;
    setPending(true);
    const parsed = points.trim() === "" ? null : Number(points.replace(",", "."));
    const ok = await onCreate(
      titleFor(kind),
      parsed == null || Number.isNaN(parsed) ? null : parsed,
      kind,
      rubroId,
    );
    setPending(false);
    if (ok) onClose();
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center">
      <motion.button
        type="button"
        aria-label={t.gradebook.cancel}
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={w.addColumn}
        className="relative z-10 w-full max-w-sm rounded-t-3xl bg-surface p-5 shadow-2xl sm:rounded-3xl"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 24 }}
        transition={{ type: "spring", stiffness: 380, damping: 34 }}
      >
        <div className="flex items-center justify-between">
          <h4 className="text-lg font-bold text-foreground">{w.addColumn}</h4>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.common.close}
            className="flex h-9 w-9 items-center justify-center rounded-full text-foreground/70 transition-colors hover:bg-surface-muted hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-foreground/70">
              {copy.columnRubro}
            </span>
            <select
              value={rubroId}
              onChange={(event) => setRubroId(event.target.value)}
              className="h-10 rounded-xl border border-border bg-background px-3 text-sm font-semibold text-foreground outline-none focus:border-brand-400"
            >
              {rubros.map((rubro) => (
                <option key={rubro.id} value={rubro.id}>
                  {rubro.name} · {rubro.peso}%
                </option>
              ))}
            </select>
            <span className="text-xs font-medium text-foreground/50">
              {copy.columnRubroHint}
            </span>
          </label>
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
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold text-foreground/70">{w.columnKind}</span>
            <div className="flex flex-wrap gap-1.5">
              {kinds.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setKind(option)}
                  aria-pressed={kind === option}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                    kind === option
                      ? "border-transparent bg-brand-600 text-white"
                      : "border-border text-foreground/65 hover:text-foreground",
                  )}
                >
                  {w.kinds[option]}
                </button>
              ))}
            </div>
            <p className="text-xs text-foreground/50">{titleFor(kind)}</p>
          </div>
          <div className="mt-1 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 items-center justify-center rounded-xl border border-border px-4 text-sm font-semibold text-foreground/70 ui-hover"
            >
              {t.gradebook.cancel}
            </button>
            <button
              type="submit"
              disabled={pending}
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-700 active:scale-[0.98] disabled:opacity-50"
            >
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {w.create}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
