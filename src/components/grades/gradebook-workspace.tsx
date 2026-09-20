"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
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
  Trash2,
  Undo2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/client";
import { TONE_PILL } from "@/lib/dashboard/tones";
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
import type { AssignmentKind, ExamColumn } from "@/lib/dashboard/exams";
import type { ClassOption } from "@/lib/dashboard/gradebook";
import type { TeacherStudent } from "@/lib/dashboard/grupos";
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

function cellMax(column: ExamColumn, studentId: string): number {
  const grade = column.grades[studentId];
  return grade?.maxMarks || column.points || 100;
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

function columnAverage(column: ExamColumn, students: TeacherStudent[]): number | null {
  return average(students.map((student) => columnPct(column, student.id)));
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

/** Consecutive columns of the same type share one header group cell. */
function buildGroups(
  columns: ExamColumn[],
): { key: string; kind: AssignmentKind; count: number }[] {
  const groups: { key: string; kind: AssignmentKind; count: number }[] = [];
  for (const column of columns) {
    const last = groups[groups.length - 1];
    if (last && last.kind === column.kind) last.count += 1;
    else groups.push({ key: column.id, kind: column.kind, count: 1 });
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
  supportFlags = {},
}: {
  classId: string;
  groupName: string;
  students: TeacherStudent[];
  classContext: ClassOption;
  initialSubjectId: string | null;
  initialExams: ExamColumn[];
  supportFlags?: ClassEducationalSupportFlags;
}) {
  const t = useT();
  const w = t.gradebook.workspace;
  const [subjectId, setSubjectId] = useState(initialSubjectId);
  const [exams, setExams] = useState<ExamColumn[]>(initialExams);
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
  const colTop = dense ? "top-8" : "top-9";
  const colHeadH = dense ? "h-8" : "h-10";

  const visibleStudents = students.filter((student) =>
    studentName(student).toLowerCase().includes(query.trim().toLowerCase()),
  );

  // Columns are displayed sorted by type, so every type is a single group and a
  // header cell never repeats. Order within a type is preserved (stable sort).
  const orderedExams = [...exams].sort(
    (a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind),
  );

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

  const groups = buildGroups(orderedExams);

  /** Auto title for a new column: type + its sequence among that type. */
  function nextTitleFor(kind: AssignmentKind): string {
    const count = exams.filter((column) => column.kind === kind).length;
    return `${w.kinds[kind]} ${count + 1}`;
  }

  const overall = average(
    visibleStudents.flatMap((student) =>
      exams.map((column) => columnPct(column, student.id)),
    ),
  );

  async function changeSubject(nextId: string | null) {
    setSubjectId(nextId);
    setError(null);
    setLoading(true);
    const res = await fetchSubjectExams({ classId, subjectId: nextId });
    setLoading(false);
    if (res.ok) setExams(res.exams);
    else setError(res.error);
  }

  async function refresh() {
    const res = await fetchSubjectExams({ classId, subjectId });
    if (res.ok) setExams(res.exams);
  }

  async function handleCreate(title: string, points: number | null, kind: AssignmentKind) {
    setError(null);
    const res = await addExamColumn({ classId, title, points, subjectId, kind });
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
    const header = [
      t.gradebook.headers.student,
      ...orderedExams.map((column) => column.title),
      w.final,
    ];
    const rows = visibleStudents.map((student) => [
      studentName(student),
      ...orderedExams.map((column) => column.grades[student.id]?.mark ?? ""),
      studentAverage(orderedExams, student.id) ?? "",
    ]);
    const csv = [header, ...rows]
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
            onClick={() => setAddOpen(true)}
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-brand-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-700 active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} />
            {w.addColumn}
          </button>
        </div>
      </header>

      {classContext.subjects.length > 1 ? (
        <div className="no-scrollbar flex gap-2 overflow-x-auto">
          {classContext.subjects.map((option) => {
            const active = option.id === subjectId;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => void changeSubject(option.id)}
                className={cn(
                  "shrink-0 rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors",
                  active
                    ? cn("border border-transparent", TONE_PILL.blue)
                    : "ui-hover border border-border text-foreground/60 hover:text-foreground",
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

      {error ? (
        <div className="rounded-xl border border-error/30 bg-error/10 px-4 py-2.5 text-sm font-medium text-error">
          {error}
        </div>
      ) : null}

      {undoColumn ? (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface-muted/60 px-4 py-2 text-sm">
          <span className="font-medium text-foreground/70">
            {w.deleteColumn}: {undoColumn.title}
          </span>
          <button
            type="button"
            onClick={() => void handleUndo()}
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-semibold text-[#7c3aed] transition-colors hover:bg-[#e6defb] dark:text-[#b9a3f7] dark:hover:bg-[#241b45]"
          >
            <Undo2 className="h-4 w-4" />
            {t.gradebook.undo}
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
                      colSpan={group.count}
                      className={cn(
                        "sticky top-0 z-40 border-b border-l border-border bg-surface-muted px-2 text-center text-[10px] font-bold uppercase leading-none tracking-[0.14em] text-foreground/55",
                        dense ? "h-8" : "h-9",
                      )}
                    >
                      {w.kinds[group.kind]}
                    </th>
                  ))}
                  <th
                    rowSpan={2}
                    className={cn("sticky right-0 top-0 z-50 w-[4.5rem] border-b border-l border-border bg-surface px-2 text-center text-xs font-bold uppercase tracking-wide", ACCENT_TEXT, headY)}
                  >
                    {w.final}
                  </th>
                </tr>

                {/* Column labels row */}
                <tr>
                  {orderedExams.map((column) => {
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
                </tr>
              </thead>

              <tbody>
                {visibleStudents.map((student, rowIndex) => {
                  const final = studentAverage(exams, student.id);
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
                      {orderedExams.map((column, colIndex) => (
                        <td key={column.id} className="border-b border-r border-border px-0.5">
                          <GradeCell
                            key={`${column.id}:${student.id}`}
                            classId={classId}
                            column={column}
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
                      ))}
                      <td className={cn("sticky right-0 z-20 w-[4.5rem] border-b border-l border-border bg-surface px-2 text-center", rowY)}>
                        <span className={cn("inline-block rounded-md px-2 py-0.5 text-sm font-bold leading-none tabular-nums", final == null ? "text-foreground/40" : TINT_FINAL)}>
                          {final == null ? "—" : final}
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
                    {w.columnAverage}
                  </td>
                  {orderedExams.map((column) => {
                    const avg = columnAverage(column, visibleStudents);
                    return (
                      <td
                        key={column.id}
                        className="sticky bottom-0 z-30 border-r border-t border-border bg-surface-muted px-1 py-1 text-center text-xs font-bold"
                      >
                        <span className={cn("inline-block rounded-md px-2 py-0.5 font-bold tabular-nums", avg == null ? "text-foreground/40" : tintFor(avg))}>
                          {avg == null ? "—" : avg}
                        </span>
                      </td>
                    );
                  })}
                  <td className={cn("sticky bottom-0 right-0 z-40 w-[4.5rem] border-l border-t border-border bg-surface-muted px-2 text-center text-xs font-bold", headY)}>
                    <span className={cn("inline-block rounded-md px-2 py-0.5 tabular-nums", overall == null ? "text-foreground/40" : TINT_FINAL)}>
                      {overall == null ? "—" : overall}
                    </span>
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
                />
              ) : null}
            </AnimatePresence>,
            document.body,
          )
        : null}

      <ConfirmDialog
        open={deleteTarget !== null}
        title={w.deleteColumnConfirm}
        description={deleteTarget?.title}
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
        description={closeTarget?.title}
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
  const cellTitle =
    stored?.status === "missing"
      ? `${column.title} — ${w.missingMark}`
      : column.title;
  const numeric = text.trim() === "" ? null : Number(text.replace(",", "."));
  const pct = pctOf(numeric, max);

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
        aria-label={cellTitle}
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

  return (
    <div className="group/col relative flex w-full flex-col items-center gap-1">
      <span
        title={column.title || w.kinds[column.kind]}
        className={cn(
          "max-w-full whitespace-nowrap px-1 text-center font-bold leading-tight text-foreground/55",
          compact ? "text-[10px] uppercase tracking-wide" : "text-[11px]",
        )}
      >
        {compact ? label.short : density === "cozy" ? label.medium : label.full}
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
}: {
  onCreate: (title: string, points: number | null, kind: AssignmentKind) => Promise<boolean>;
  onClose: () => void;
  titleFor: (kind: AssignmentKind) => string;
}) {
  const t = useT();
  const w = t.gradebook.workspace;
  const kinds: AssignmentKind[] = ["homework", "exam", "quiz", "classwork", "project"];
  const [points, setPoints] = useState("100");
  const [kind, setKind] = useState<AssignmentKind>("homework");
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    const parsed = points.trim() === "" ? null : Number(points.replace(",", "."));
    const ok = await onCreate(
      titleFor(kind),
      parsed == null || Number.isNaN(parsed) ? null : parsed,
      kind,
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
        className="absolute inset-0 cursor-default bg-black/40"
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
            <span className="text-xs font-semibold text-foreground/70">{w.columnPoints}</span>
            <input
              autoFocus
              value={points}
              onChange={(event) => setPoints(event.target.value)}
              inputMode="numeric"
              className="h-10 rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 dark:focus:ring-brand-950"
            />
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
