"use client";

import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import {
  Check,
  Download,
  Loader2,
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
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { SubmitReport } from "@/components/grades/submit-report";
import {
  addExamColumn,
  fetchSubjectExams,
  removeExamColumn,
  restoreExamColumn,
  saveGrade,
} from "@/lib/teachers/exams-actions";
import type { AssignmentKind, ExamColumn } from "@/lib/dashboard/exams";
import type { ClassOption } from "@/lib/dashboard/gradebook";
import type { TeacherStudent } from "@/lib/dashboard/grupos";
import {
  ATTENDANCE_CODE,
  emptyAttendanceCounts,
  type AttendanceCounts,
  type AttendanceStatus,
} from "@/lib/attendance/model";

/** Ausencia types shown in the gradebook summary, most severe first. */
const ABSENCE_ORDER: AttendanceStatus[] = [
  "absence_unjustified",
  "absence_justified",
  "late_unjustified",
  "late_justified",
];

const PASS = 70;

/** Color per column type so a Tarea reads differently from an Examen. */
const KIND_STYLES: Record<AssignmentKind, string> = {
  classwork: "bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300",
  homework: "bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300",
  exam: "bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300",
  quiz: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  project: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
};

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

function tintFor(pct: number | null): string {
  if (pct == null) return "";
  if (pct >= PASS) return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  if (pct >= 50) return "bg-amber-500/10 text-amber-700 dark:text-amber-300";
  return "bg-rose-500/10 text-rose-700 dark:text-rose-300";
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
  attendance,
}: {
  classId: string;
  groupName: string;
  students: TeacherStudent[];
  classContext: ClassOption;
  initialSubjectId: string | null;
  initialExams: ExamColumn[];
  attendance: Record<string, AttendanceCounts>;
}) {
  const t = useT();
  const w = t.gradebook.workspace;
  const [subjectId, setSubjectId] = useState(initialSubjectId);
  const [exams, setExams] = useState<ExamColumn[]>(initialExams);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [dense, setDense] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ExamColumn | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [undoColumn, setUndoColumn] = useState<ExamColumn | null>(null);

  const subject = classContext.subjects.find((s) => s.id === subjectId) ?? null;
  const subjectName = subject?.name ?? (classContext.subjects.length <= 1 ? null : w.title);

  // Density drives every cell, not just the grade columns, so the toggle is
  // visible on a subject that has no columns yet.
  const rowY = dense ? "py-0.5" : "py-1.5";
  const headY = dense ? "py-1.5" : "py-2";

  const visibleStudents = students.filter((student) =>
    studentName(student).toLowerCase().includes(query.trim().toLowerCase()),
  );

  // Auto label per column: short code + sequence among that type (CW 1) for the
  // compact view, and the full kind name (Classwork 1) for the expanded view.
  const labels = new Map<string, { short: string; full: string }>();
  const counters = new Map<AssignmentKind, number>();
  for (const column of exams) {
    const next = (counters.get(column.kind) ?? 0) + 1;
    counters.set(column.kind, next);
    labels.set(column.id, {
      short: `${w.kindShort[column.kind]} ${next}`,
      full: `${w.kinds[column.kind]} ${next}`,
    });
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
      ...exams.map((column) => column.title),
      ...ABSENCE_ORDER.map((status) => ATTENDANCE_CODE[status]),
      w.final,
    ];
    const rows = visibleStudents.map((student) => {
      const counts = attendance[student.id] ?? emptyAttendanceCounts();
      return [
        studentName(student),
        ...exams.map((column) => column.grades[student.id]?.mark ?? ""),
        ...ABSENCE_ORDER.map((status) => counts[status]),
        studentAverage(exams, student.id) ?? "",
      ];
    });
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
            onClick={() => setDense((value) => !value)}
            title={w.density}
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border px-3.5 text-sm font-semibold text-foreground/70 transition-colors hover:bg-surface-muted"
          >
            {dense ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
            {dense ? w.expanded : w.dense}
          </button>
          <button
            type="button"
            onClick={exportCsv}
            disabled={exams.length === 0}
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border px-3.5 text-sm font-semibold text-foreground/70 transition-colors hover:bg-surface-muted disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            {w.export}
          </button>
          <SubmitReport classId={classId} subjectId={subjectId} subjectName={subjectName} disabled={false} />
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="inline-flex h-9 items-center gap-1.5 rounded-full brand-gradient px-4 text-sm font-semibold text-white transition-all hover:brightness-105 active:scale-[0.98]"
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
                    ? "brand-gradient text-white"
                    : "border border-border text-foreground/60 hover:bg-surface-muted hover:text-foreground",
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
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            ≥ {PASS}%
          </span>
          <span className="flex items-center gap-1.5 text-foreground/50">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
            50–69%
          </span>
          <span className="flex items-center gap-1.5 text-foreground/50">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-500" /> &lt; 50%
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-medium text-foreground/50">
        <span className="font-bold uppercase tracking-wide text-foreground/40">
          {t.attendance.column}
        </span>
        {ABSENCE_ORDER.map((status) => (
          <span key={status} className="inline-flex items-center gap-1.5">
            <span className="font-bold text-foreground/70">{ATTENDANCE_CODE[status]}</span>
            {t.attendance.statuses[status]}
          </span>
        ))}
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
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-semibold text-brand-700 transition-colors hover:bg-brand-50 dark:text-brand-300 dark:hover:bg-brand-950/40"
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
        <div className="flex flex-wrap items-start gap-4">
          <div className="relative min-w-0 flex-1 overflow-auto rounded-2xl border border-border bg-surface">
            {loading ? (
              <div className="absolute inset-0 z-40 flex items-center justify-center bg-surface/60 backdrop-blur-[1px]">
                <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
              </div>
            ) : null}

            <table className="w-full table-fixed border-separate border-spacing-0 text-sm">
              <thead>
                <tr className={dense ? "h-8" : "h-10"}>
                  <th className={cn("sticky left-0 top-0 z-40 w-10 border-b border-r border-border bg-surface px-2 text-center text-xs font-bold text-foreground/40", headY)}>
                    #
                  </th>
                  <th className={cn("sticky left-10 top-0 z-40 min-w-[13rem] border-b border-r border-border bg-surface px-3 text-left text-xs font-bold uppercase tracking-wide text-foreground/50", headY)}>
                    {t.gradebook.headers.student}
                  </th>
                  {exams.map((column) => {
                    const label = labels.get(column.id) ?? {
                      short: column.title,
                      full: column.title,
                    };
                    return (
                      <th
                        key={column.id}
                        className={cn(
                          "sticky top-0 z-30 border-b border-r border-border bg-surface px-1 py-1.5 text-center align-bottom",
                          dense ? "w-[3.5rem]" : "w-[7.5rem]",
                        )}
                      >
                        <ColumnHeader
                          column={column}
                          label={label}
                          dense={dense}
                          onDelete={() => setDeleteTarget(column)}
                        />
                      </th>
                    );
                  })}
                  <th className={cn("sticky right-0 top-0 z-40 w-[5.5rem] border-b border-l border-border bg-surface px-3 text-center text-xs font-bold uppercase tracking-wide text-brand-700 dark:text-brand-300", headY)}>
                    {w.final}
                  </th>
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
                        <Link
                          href={`/estudiantes/${student.id}?from=${encodeURIComponent(`/grupos/${classId}`)}`}
                          title={studentName(student)}
                          className="block truncate font-medium text-foreground transition-colors hover:text-brand-700 dark:hover:text-brand-300"
                        >
                          {studentName(student)}
                        </Link>
                      </td>
                      {exams.map((column, colIndex) => (
                        <td key={column.id} className="border-b border-r border-border px-0.5">
                          <GradeCell
                            key={`${column.id}:${student.id}`}
                            classId={classId}
                            column={column}
                            studentId={student.id}
                            row={rowIndex}
                            col={colIndex}
                            dense={dense}
                            onSaved={refresh}
                          />
                        </td>
                      ))}
                      <td className={cn("sticky right-0 z-20 w-[5.5rem] border-b border-l border-border bg-surface px-3 text-center", rowY)}>
                        <span className={cn("inline-block rounded-md px-2 py-0.5 text-sm font-bold leading-none", tintFor(final) || "text-foreground/40")}>
                          {final == null ? "—" : `${final}%`}
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
                  {exams.map((column) => {
                    const avg = columnAverage(column, visibleStudents);
                    return (
                      <td
                        key={column.id}
                        className="sticky bottom-0 z-30 border-r border-t border-border bg-surface-muted px-1 py-1 text-center text-xs font-bold"
                      >
                        <span className={cn("rounded px-1.5 py-0.5", tintFor(avg) || "text-foreground/40")}>
                          {avg == null ? "—" : `${avg}%`}
                        </span>
                      </td>
                    );
                  })}
                  <td className={cn("sticky bottom-0 right-0 z-40 w-[5.5rem] border-l border-t border-border bg-surface-muted px-3 text-center text-xs font-bold text-brand-700 dark:text-brand-300", headY)}>
                    {overall == null ? "—" : `${overall}%`}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
          <AttendancePanel
            students={visibleStudents}
            attendance={attendance}
            dense={dense}
          />
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
  onSaved,
}: {
  classId: string;
  column: ExamColumn;
  studentId: string;
  row: number;
  col: number;
  dense: boolean;
  onSaved: () => void;
}) {
  const initial = column.grades[studentId]?.mark ?? null;
  const [text, setText] = useState(initial == null ? "" : String(initial));
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const dirty = useRef(false);

  const max = cellMax(column, studentId);
  const numeric = text.trim() === "" ? null : Number(text.replace(",", "."));
  const pct = pctOf(numeric, max);

  async function commit() {
    if (!dirty.current) return;
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
        aria-label={`${column.title}`}
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
          "w-full rounded-md border border-transparent bg-transparent px-1 text-center font-medium tabular-nums text-foreground outline-none transition-colors focus:border-brand-400 focus:bg-surface",
          dense ? "h-7 min-w-[2.25rem] text-[13px]" : "h-8 min-w-[3.25rem] text-sm",
          status === "error" ? "border-error/60 text-error" : tintFor(pct),
        )}
      />
      {status === "saving" ? (
        <Loader2 className="absolute right-1 top-1.5 h-3 w-3 animate-spin text-foreground/40" />
      ) : null}
    </div>
  );
}

/** Absence counts escalate visually: 1-2 amber, 3+ rose, 0 stays muted. */
function absenceTint(count: number): string {
  if (count <= 0) return "text-foreground/70";
  if (count >= 3) return "bg-rose-500/15 text-rose-700 dark:text-rose-300";
  return "bg-amber-500/15 text-amber-700 dark:text-amber-300";
}

/** Read-only attendance cell: the four ausencia counts accumulated across every
 * recorded date. Numbers only — the rate is not shown because it is cumulative. */
function AttendanceCell({ counts }: { counts?: AttendanceCounts }) {
  const t = useT();
  const resolved = counts ?? emptyAttendanceCounts();
  return (
    <div className="flex items-center justify-center divide-x divide-border text-[11px] font-semibold tabular-nums">
      {ABSENCE_ORDER.map((status) => (
        <span
          key={status}
          title={t.attendance.statuses[status]}
          className="inline-flex items-center gap-0.5 px-1.5 first:pl-0 last:pr-0"
        >
          <span className="font-bold text-foreground/55">{ATTENDANCE_CODE[status]}</span>
          <span
            className={cn(
              "min-w-[1rem] rounded px-1 text-center font-bold",
              absenceTint(resolved[status]),
            )}
          >
            {resolved[status]}
          </span>
        </span>
      ))}
    </div>
  );
}

/** Read-only attendance panel: the cumulative ausencia counts per student, in a
 * detached card next to the gradebook. Row heights mirror the table (`h-8`/`h-9`
 * body, taller header/footer) so the two columns line up. */
function AttendancePanel({
  students,
  attendance,
  dense,
}: {
  students: TeacherStudent[];
  attendance: Record<string, AttendanceCounts>;
  dense: boolean;
}) {
  const t = useT();
  const headH = dense ? "h-8" : "h-10";
  const rowH = dense ? "h-8" : "h-9";
  const footH = dense ? "h-8" : "h-10";

  return (
    <div className="flex w-[13rem] shrink-0 flex-col overflow-hidden rounded-2xl border border-border bg-surface">
      <div
        className={cn(
          "flex items-center justify-center border-b border-border px-2 text-center text-xs font-bold uppercase tracking-wide text-foreground/50",
          headH,
        )}
      >
        {t.attendance.column}
      </div>
      <div className="flex flex-1 flex-col">
        {students.map((student) => (
          <div
            key={student.id}
            className={cn(
              "flex items-center justify-center border-b border-border px-2",
              rowH,
            )}
          >
            <AttendanceCell counts={attendance[student.id]} />
          </div>
        ))}
      </div>
      <div
        className={cn("border-t border-border bg-surface-muted", footH)}
        aria-hidden
      />
    </div>
  );
}

function ColumnHeader({
  column,
  label,
  dense,
  onDelete,
}: {
  column: ExamColumn;
  label: { short: string; full: string };
  dense: boolean;
  onDelete: () => void;
}) {
  const t = useT();
  const w = t.gradebook.workspace;

  return (
    <div className="group/col relative flex w-full flex-col items-center gap-1">
      <span
        title={column.title || w.kinds[column.kind]}
        className={cn(
          "max-w-full whitespace-nowrap rounded px-1.5 py-0.5 text-center text-[10px] font-bold leading-tight",
          KIND_STYLES[column.kind],
          dense ? "uppercase tracking-wide" : "normal-case",
        )}
      >
        {dense ? label.short : label.full}
      </span>
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
}: {
  onCreate: (title: string, points: number | null, kind: AssignmentKind) => Promise<boolean>;
  onClose: () => void;
}) {
  const t = useT();
  const w = t.gradebook.workspace;
  const kinds: AssignmentKind[] = ["classwork", "homework", "exam", "quiz", "project"];
  const [title, setTitle] = useState("");
  const [points, setPoints] = useState("100");
  const [kind, setKind] = useState<AssignmentKind>("classwork");
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    const parsed = points.trim() === "" ? null : Number(points.replace(",", "."));
    const ok = await onCreate(
      title.trim(),
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
            <span className="text-xs font-semibold text-foreground/70">{w.columnTitle}</span>
            <input
              autoFocus
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={120}
              className="h-10 rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 dark:focus:ring-brand-950"
            />
          </label>
          <div className="flex gap-3">
            <label className="flex flex-1 flex-col gap-1.5">
              <span className="text-xs font-semibold text-foreground/70">{w.columnPoints}</span>
              <input
                value={points}
                onChange={(event) => setPoints(event.target.value)}
                inputMode="numeric"
                className="h-10 rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 dark:focus:ring-brand-950"
              />
            </label>
            <label className="flex flex-1 flex-col gap-1.5">
              <span className="text-xs font-semibold text-foreground/70">{w.columnKind}</span>
              <select
                value={kind}
                onChange={(event) => setKind(event.target.value as AssignmentKind)}
                className="h-10 rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-brand-400"
              >
                {kinds.map((option) => (
                  <option key={option} value={option}>
                    {w.kinds[option]}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="mt-1 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 items-center justify-center rounded-xl border border-border px-4 text-sm font-semibold text-foreground/70 transition-colors hover:bg-surface-muted"
            >
              {t.gradebook.cancel}
            </button>
            <button
              type="submit"
              disabled={pending}
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl brand-gradient px-4 text-sm font-semibold text-white transition-all hover:brightness-105 disabled:opacity-60"
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
