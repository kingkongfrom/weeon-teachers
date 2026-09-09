"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import {
  DataGrid,
  type Column,
  type RenderEditCellProps,
  type RowsChangeData,
} from "react-data-grid";
import { ArrowDownRight, ArrowUpRight, ChartPie, ChartSpline, Loader2, Plus, Trash2, Undo2 } from "lucide-react";
import type { ExamColumn } from "@/lib/dashboard/exams";
import {
  addExamColumn,
  removeExamColumn,
  restoreExamColumn,
  saveGrade,
  updateExamColumn,
} from "@/lib/teachers/exams-actions";
import "react-data-grid/lib/styles.css";

type StudentRow = {
  id: string;
  firstName: string;
  lastName: string;
  secondLastName: string | null;
};

type GridRow = {
  id: string;
  name: string;
  [assignmentId: string]: number | string | null;
};

type GradesTableProps = {
  classId: string;
  subjectId?: string | null;
  students: StudentRow[];
  initialExams: ExamColumn[];
  loading?: boolean;
  /** Fired after a grade edit is committed, so the parent can invalidate any
   * client-side cache for this subject and avoid stale snapshots. */
  onGradeEdit?: () => void;
};

const HEADER_HEIGHT = 40;
const ROW_HEIGHT = 36;

// Auto-fit bounds: columns shrink/grow with their widest content (Excel-like).
// Exam columns have no max width — a header title is never cut off.
const NAME_WIDTH_FACTOR = 1.2;
const MIN_NAME_WIDTH = 170;
const MAX_NAME_WIDTH = 340;
const MIN_EXAM_WIDTH = 88;
const MIN_AVERAGE_WIDTH = 108;
const EXAM_CHROME = 44;
const HEADER_TRACKING_PER_CHAR = 0.4;

const NAME_CHROME = 56;

function measureHeaderLabel(text: string): number {
  const upper = text.toUpperCase();
  return (
    measureText(upper, 500, 12) + upper.length * HEADER_TRACKING_PER_CHAR
  );
}

function studentName(student: StudentRow): string {
  return `${student.firstName} ${student.lastName}${
    student.secondLastName ? ` ${student.secondLastName}` : ""
  }`;
}

let measureCtx: CanvasRenderingContext2D | null = null;
let measureFontFamily: string | null = null;

/** Measures rendered text width. `size` defaults to the grid's 14px font. */
function measureText(text: string, weight: 400 | 500 | 600 = 400, size = 14): number {
  if (typeof document === "undefined") return text.length * 7;
  if (!measureCtx) {
    measureCtx = document.createElement("canvas").getContext("2d");
  }
  if (!measureCtx) return text.length * 7;
  if (!measureFontFamily) {
    measureFontFamily = getComputedStyle(document.body).fontFamily;
  }
  measureCtx.font = `${weight} ${size}px ${measureFontFamily}`;
  return measureCtx.measureText(text).width;
}

function clampWidth(width: number, min: number, max: number): number {
  return Math.ceil(Math.min(Math.max(width, min), max));
}

/**
 * Width of each column, fitted to its widest rendered text. Header titles are
 * measured from the live draft while the teacher types, so the column grows
 * with every keystroke and the last character is never clipped.
 */
function computeColumnWidths(
  exams: ExamColumn[],
  students: StudentRow[],
  draftTitles: Record<string, string>,
): { nameWidth: number; examWidths: number[]; averageWidth: number } {
  let widestName = 0;
  for (const student of students) {
    widestName = Math.max(widestName, measureText(studentName(student), 500));
  }
  const nameWidth = clampWidth(
    Math.ceil((widestName + NAME_CHROME) * NAME_WIDTH_FACTOR),
    Math.ceil(MIN_NAME_WIDTH * NAME_WIDTH_FACTOR),
    Math.ceil(MAX_NAME_WIDTH * NAME_WIDTH_FACTOR),
  );

  const examWidths = exams.map((exam) => {
    const title = draftTitles[exam.id] ?? exam.title;
    let widest = measureHeaderLabel(title || " ");
    for (const student of students) {
      const mark = exam.grades[student.id]?.mark;
      if (mark != null) {
        widest = Math.max(widest, measureText(String(mark)));
      }
    }
    return Math.ceil(Math.max(widest + EXAM_CHROME, MIN_EXAM_WIDTH));
  });

  const averageWidth = clampWidth(
    Math.ceil(
      Math.max(
        measureHeaderLabel("Promedio"),
        measureText("100%", 600, 14),
      ) + EXAM_CHROME,
    ),
    MIN_AVERAGE_WIDTH,
    140,
  );

  return { nameWidth, examWidths, averageWidth };
}

/**
 * Parses a typed/pasted grade. Empty clears the mark; numbers are clamped to
 * [0, max]. Returns ok: false for non-numeric or negative input.
 */
function parseGrade(
  raw: unknown,
  max: number,
): { ok: true; value: number | null } | { ok: false } {
  if (raw == null) return { ok: true, value: null };
  const trimmed = String(raw).trim();
  if (trimmed === "") return { ok: true, value: null };
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed < 0) return { ok: false };
  return { ok: true, value: Math.min(parsed, max) };
}

export function GradesTable({
  classId,
  subjectId = null,
  students,
  initialExams,
  loading = false,
  onGradeEdit,
}: GradesTableProps) {
  const [exams, setExams] = useState<ExamColumn[]>(initialExams);
  const [adding, setAdding] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  // Live header text while the teacher types — drives column auto-fit so the
  // column grows with each keystroke instead of clipping the last character.
  const [draftTitles, setDraftTitles] = useState<Record<string, string>>({});
  // Hovered exam column — shows the floating delete button above it. A delay
  // lets the pointer travel from the header up onto the button without hiding.
  const [hoverColumn, setHoverColumn] = useState<string | null>(null);
  const [hoverColumnRemoving, setHoverColumnRemoving] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Snapshot of the last removed column so the teacher can undo the delete.
  // `index` restores the column to its original position in the grid.
  const [deletedSnapshot, setDeletedSnapshot] = useState<{
    column: ExamColumn;
    index: number;
  } | null>(null);
  const [undoing, setUndoing] = useState(false);
  // Toast auto-dismiss: hides the undo snackbar after a few seconds so it does
  // not linger. Reset whenever a new column is deleted.
  const [toastOpen, setToastOpen] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showDelete(columnId: string) {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
    setHoverColumn(columnId);
  }

  function hideDelete() {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setHoverColumn(null), 200);
  }

  useEffect(
    () => () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    },
    [],
  );

  // Auto-dismiss the undo toast a few seconds after a column is deleted.
  useEffect(() => {
    if (!deletedSnapshot) return;
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastOpen(false), 15000);
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, [deletedSnapshot]);

  // Deterministic min widths on first render (SSR-safe); the effect below
  // swaps in canvas-measured content widths once mounted.
  const [{ nameWidth, examWidths, averageWidth }, setWidths] = useState(() => ({
    nameWidth: Math.ceil(MIN_NAME_WIDTH * NAME_WIDTH_FACTOR),
    examWidths: initialExams.map(() => MIN_EXAM_WIDTH),
    averageWidth: MIN_AVERAGE_WIDTH,
  }));

  useEffect(() => {
    const update = () =>
      setWidths(computeColumnWidths(exams, students, draftTitles));
    update();
    // Re-measure once the real webfont is ready so widths are not based on
    // fallback-font metrics.
    document.fonts?.ready.then(update).catch(() => {});
  }, [exams, students, draftTitles]);

  function handleDraftTitle(id: string, text: string | null) {
    setDraftTitles((current) => {
      const next = { ...current };
      if (text === null) {
        delete next[id];
      } else {
        next[id] = text;
      }
      return next;
    });
  }

  const rows: GridRow[] = students.map((student) => {
    const row: GridRow = { id: student.id, name: studentName(student) };
    for (const exam of exams) {
      row[exam.id] = exam.grades[student.id]?.mark ?? null;
    }
    return row;
  });

  function patchColumn(id: string, patch: Partial<Pick<ExamColumn, "title">>) {
    setExams((current) =>
      current.map((column) =>
        column.id === id ? { ...column, ...patch } : column,
      ),
    );
  }

  async function addColumn() {
    if (adding) return;
    setAdding(true);
    setActionError(null);
    const result = await addExamColumn({
      classId,
      subjectId,
      title: "",
      points: null,
    });
    setAdding(false);
    if (!result.ok || !result.id) {
      setActionError(
        result.ok ? "No se pudo agregar la columna." : result.error,
      );
      return;
    }
    const id = result.id;
    setExams((current) => [
      ...current,
      { id, title: "", points: null, grades: {} },
    ]);
  }

  function handleRowsChange(
    updatedRows: GridRow[],
    data: RowsChangeData<GridRow>,
  ) {
    const columnId = data.column.key;
    if (columnId === "name") return;

    const exam = exams.find((column) => column.id === columnId);
    if (!exam) return;
    const max = exam.points ?? 100;

    let invalid = false;
    const pending: Array<{
      studentId: string;
      prev: number | null;
      value: number | null;
    }> = [];
    for (const index of data.indexes) {
      const row = updatedRows[index];
      const parsed = parseGrade(row[columnId], max);
      if (!parsed.ok) {
        invalid = true;
        continue;
      }
      const prev = exam.grades[row.id]?.mark ?? null;
      if (parsed.value === prev) continue;
      pending.push({ studentId: row.id, prev, value: parsed.value });
    }

    if (invalid) {
      setActionError(
        "La nota debe ser un número entre 0 y el máximo de la columna.",
      );
    }
    if (pending.length === 0) return;
    setActionError(null);

    setExams((current) =>
      current.map((column) => {
        if (column.id !== columnId) return column;
        const grades = { ...column.grades };
        for (const change of pending) {
          if (change.value === null) {
            delete grades[change.studentId];
          } else {
            grades[change.studentId] = { mark: change.value, maxMarks: max };
          }
        }
        return { ...column, grades };
      }),
    );

    void (async () => {
      for (const change of pending) {
        const result = await saveGrade({
          classId,
          assignmentId: columnId,
          studentId: change.studentId,
          mark: change.value,
        });
        if (!result.ok) {
          setExams((current) =>
            current.map((column) => {
              if (column.id !== columnId) return column;
              const grades = { ...column.grades };
              if (change.prev === null) {
                delete grades[change.studentId];
              } else {
                grades[change.studentId] = { mark: change.prev, maxMarks: max };
              }
              return { ...column, grades };
            }),
          );
          setActionError(result.error);
        }
      }
      onGradeEdit?.();
    })();
  }

  // Widths aligned with `exams` (fall back to the min while a freshly added
  // column waits for the measuring effect).
  const widths = exams.map((_, index) => examWidths[index] ?? MIN_EXAM_WIDTH);

  const examColumns: Column<GridRow>[] = exams.map((exam, index) => ({
    key: exam.id,
    name: exam.title,
    width: widths[index],
    editable: true,
    headerCellClass: "rdg-exam-header-cell",
    cellClass: "rdg-grade-cell",
    renderHeaderCell: () => (
      <ExamHeaderCell
        classId={classId}
        column={exam}
        onPatch={patchColumn}
        onDraftTitle={handleDraftTitle}
        onError={setActionError}
        onHoverStart={() => showDelete(exam.id)}
        onHoverEnd={hideDelete}
      />
    ),
    renderEditCell: (props) => (
      <GradeEditor {...props} max={exam.points ?? 100} />
    ),
  }));

  const columns: Column<GridRow>[] = [
    {
      key: "name",
      name: "Estudiante",
      frozen: true,
      width: nameWidth,
      editable: false,
      headerCellClass: "rdg-name-header-cell",
      renderHeaderCell: () => (
        <div className="flex h-full w-full items-center px-2 text-xs font-medium uppercase tracking-wide text-foreground/50">
          Estudiante
        </div>
      ),
      renderCell: ({ row, rowIdx }) => (
        <span>
          <span className="mr-3 inline-block w-5 text-xs tabular-nums text-foreground/50">
            {rowIdx + 1}
          </span>
          <Link
            href={`/estudiantes/${row.id}`}
            className="cursor-pointer font-medium text-foreground transition-colors hover:text-brand-700 hover:underline dark:hover:text-brand-300"
          >
            {row.name}
          </Link>
        </span>
      ),
    },
    ...examColumns,
    {
      key: "__average",
      name: "Promedio",
      width: averageWidth,
      editable: false,
      headerCellClass: "rdg-average-header-cell",
      cellClass: (row) => {
        const pct = computeRowAverage(exams, row);
        if (pct === null) return "rdg-average-cell";
        const tone = pct >= 70 ? "good" : pct >= 50 ? "warn" : "low";
        return `rdg-average-cell rdg-average-cell-${tone}`;
      },
      renderHeaderCell: () => (
        <div className="flex h-full w-full items-center justify-center px-2 text-center text-xs font-medium uppercase tracking-wide text-foreground/50 rdg-average-header-round">
          Promedio
        </div>
      ),
      renderCell: ({ row }) => <AverageCell row={row} exams={exams} />,
    },
  ];

  const gridWidth =
    nameWidth +
    widths.reduce((total, width) => total + width, 0) +
    averageWidth;
  const gridHeight = HEADER_HEIGHT + students.length * ROW_HEIGHT;

  // Floating delete button: sits above the hovered exam column, in the outer
  // wrapper (overflow visible) so it is never clipped by the scroll box.
  const hoverIndex = exams.findIndex((exam) => exam.id === hoverColumn);
  const hoverLeft =
    hoverIndex >= 0
      ? nameWidth +
        widths.slice(0, hoverIndex).reduce((total, width) => total + width, 0)
      : 0;
  const showHoverDelete = hoverIndex >= 0 && !hoverColumnRemoving;

  async function handleRemoveHovered() {
    if (hoverColumnRemoving || !hoverColumn) return;
    const removedIndex = exams.findIndex((column) => column.id === hoverColumn);
    const removedColumn = exams[removedIndex];
    if (!removedColumn) return;
    setHoverColumnRemoving(true);
    setActionError(null);
    const result = await removeExamColumn({
      classId,
      assignmentId: hoverColumn,
    });
    setHoverColumnRemoving(false);
    if (!result.ok) {
      setActionError(result.error);
      return;
    }
    setExams((current) =>
      current.filter((column) => column.id !== hoverColumn),
    );
    setHoverColumn(null);
    setDeletedSnapshot({ column: removedColumn, index: removedIndex });
    setToastOpen(true);
  }

  async function handleUndoDelete() {
    if (undoing || !deletedSnapshot) return;
    setUndoing(true);
    setActionError(null);
    const snapshot = deletedSnapshot;
    setDeletedSnapshot(null);
    setToastOpen(false);
    const { title, points, grades } = snapshot.column;
    const result = await restoreExamColumn({
      classId,
      assignmentId: snapshot.column.id,
      title,
      points,
      grades: Object.entries(grades).map(([studentId, grade]) => ({
        studentId,
        mark: grade.mark,
        maxMarks: grade.maxMarks,
      })),
    });
    setUndoing(false);
    if (!result.ok) {
      setActionError(result.error);
      return;
    }
    setExams((current) => {
      const next = [...current];
      next.splice(Math.min(snapshot.index, next.length), 0, snapshot.column);
      return next;
    });
  }

  return (
    <div className={`flex w-full flex-col gap-4 ${loading ? "opacity-50" : ""}`}>
      <div className="w-fit" style={{ width: gridWidth }}>
        <div className="relative pe-10">
          <button
            type="button"
            onClick={() => void addColumn()}
            disabled={adding}
            aria-label="Agregar evaluación"
            title="Agregar evaluación"
            style={{
              insetInlineStart: gridWidth + 6,
              insetBlockStart: 6,
              blockSize: 32,
              inlineSize: 32,
            }}
            className="absolute z-10 inline-flex rotate-45 cursor-pointer items-center justify-center rounded-full border border-success/40 bg-success/10 text-success transition-colors hover:bg-success/20 disabled:opacity-60"
          >
            {adding ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4 -rotate-45" strokeWidth={3} />
            )}
          </button>

          {showHoverDelete && hoverIndex >= 0 ? (
            <div
              className="absolute z-20 flex justify-center"
              style={{
                insetInlineStart: hoverLeft,
                inlineSize: widths[hoverIndex] + 1,
                insetBlockStart: -25,
              }}
            >
              <button
                type="button"
                onClick={() => void handleRemoveHovered()}
                disabled={hoverColumnRemoving}
                aria-label="Eliminar columna"
                title="Eliminar columna"
                onMouseEnter={() => showDelete(hoverColumn!)}
                onMouseLeave={hideDelete}
                className="flex w-full cursor-pointer items-center justify-center gap-1 whitespace-nowrap rounded-t-md border border-error/40 bg-error/10 px-2.5 py-1 text-xs font-medium text-error transition-colors hover:bg-error/20 disabled:opacity-60"
              >
                {hoverColumnRemoving ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Trash2 className="h-3 w-3" />
                )}
                Eliminar
              </button>
            </div>
          ) : null}

          <div className="overflow-visible rounded-2xl border border-border">
            <div className="bg-surface" style={{ inlineSize: gridWidth }}>
              <DataGrid<GridRow>
                columns={columns}
                rows={rows}
                rowKeyGetter={(row) => row.id}
                onRowsChange={handleRowsChange}
                onCellPaste={({ row, column }, event) => ({
                  ...row,
                  [column.key]: event.clipboardData.getData("text/plain"),
                })}
                headerRowHeight={HEADER_HEIGHT}
                rowHeight={ROW_HEIGHT}
                className="rdg-gradebook"
                style={{ inlineSize: gridWidth, blockSize: gridHeight }}
                aria-label="Tabla de calificaciones"
              />
            </div>
          </div>
        </div>

        <GradeSummary
          classId={classId}
          exams={exams}
          students={students}
        />
      </div>

      {actionError ? (
        <p className="text-xs font-medium text-error">{actionError}</p>
      ) : null}

      <AnimatePresence>
        {deletedSnapshot && toastOpen ? (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="fixed right-4 bottom-4 z-50 rounded-xl border border-border bg-surface-elevated shadow-lg"
            role="status"
            aria-live="polite"
          >
            <button
              type="button"
              onClick={() => void handleUndoDelete()}
              disabled={undoing}
              className="inline-flex shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold text-success transition-colors hover:bg-success/10 disabled:opacity-60"
            >
              {undoing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Undo2 className="h-3.5 w-3.5" />
              )}
              Deshacer
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

/** Editable header field — the teacher types the column name directly.
 * Hovering it shows the floating delete button above the column. */
function ExamHeaderCell({
  classId,
  column,
  onPatch,
  onDraftTitle,
  onError,
  onHoverStart,
  onHoverEnd,
}: {
  classId: string;
  column: ExamColumn;
  onPatch: (id: string, patch: Partial<Pick<ExamColumn, "title">>) => void;
  onDraftTitle: (id: string, text: string | null) => void;
  onError: (message: string) => void;
  onHoverStart: () => void;
  onHoverEnd: () => void;
}) {
  const [title, setTitle] = useState(column.title);
  const [busy, setBusy] = useState(false);

  async function commitTitle() {
    const value = title.trim();
    if (busy) return;
    if (value === column.title) {
      setTitle(column.title);
      onDraftTitle(column.id, null);
      return;
    }
    setBusy(true);
    try {
      const result = await updateExamColumn({
        classId,
        assignmentId: column.id,
        title: value,
      });
      if (result.ok) {
        onPatch(column.id, { title: value });
      } else {
        setTitle(column.title);
        onError(result.error);
      }
    } catch {
      setTitle(column.title);
      onError("No se pudo actualizar la columna.");
    } finally {
      setBusy(false);
      onDraftTitle(column.id, null);
    }
  }

  return (
    <div
      className="rdg-exam-header flex h-full w-full items-center justify-center px-2"
      onKeyDown={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      onMouseEnter={onHoverStart}
      onMouseLeave={onHoverEnd}
    >
      <input
        value={title}
        disabled={busy}
        onChange={(e) => {
          setTitle(e.target.value);
          onDraftTitle(column.id, e.target.value);
        }}
        onBlur={() => void commitTitle()}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          if (e.key === "Escape") {
            setTitle(column.title);
            onDraftTitle(column.id, null);
            e.currentTarget.blur();
          }
        }}
        aria-label="Nombre de la columna"
        className="h-7 w-full min-w-0 bg-transparent text-center text-xs font-medium uppercase tracking-wide text-foreground/50 outline-none disabled:opacity-60"
        style={{ caretColor: "transparent" }}
      />
    </div>
  );
}

/**
 * Draft editor for a grade cell. The grid commits on Enter/Tab/outside click
 * (firing onRowsChange) and discards on Escape.
 */
function GradeEditor({
  row,
  column,
  onRowChange,
  max,
}: RenderEditCellProps<GridRow> & { max: number }) {
  const raw = row[column.key];
  return (
    <div className="rdg-grade-editor">
      <input
        type="text"
        inputMode="decimal"
        autoFocus
        defaultValue={raw == null ? "" : String(raw)}
        onChange={(e) => onRowChange({ ...row, [column.key]: e.target.value })}
        onFocus={(e) => e.currentTarget.select()}
        aria-label={`Nota de ${max} puntos`}
        className="rdg-grade-input"
        style={{ caretColor: "transparent" }}
      />
    </div>
  );
}

/**
 * Row-average cell: the student's mean across their graded exams, expressed as
 * a percentage. Each graded exam is normalized to its own max before averaging,
 * so exam columns with different point values contribute equally. The value is
 * tinted with a very mild stoplight color (green/amber/red) so it's easy to
 * spot at a glance.
 */
function AverageCell({ row, exams }: { row: GridRow; exams: ExamColumn[] }) {
  const pct = computeRowAverage(exams, row);
  if (pct === null)
    return <span className="text-xs text-foreground/40">—</span>;
  return <span className="rdg-average-value">{Math.round(pct)}%</span>;
}

/** Builds a normalized-marks average (0..100) for a row; null when ungraded. */
function computeRowAverage(exams: ExamColumn[], row: GridRow): number | null {
  let sum = 0;
  let count = 0;
  for (const exam of exams) {
    const mark = row[exam.id];
    if (typeof mark !== "number") continue;
    const max = exam.points || 100;
    if (max <= 0) continue;
    sum += (mark / max) * 100;
    count += 1;
  }
  if (count === 0) return null;
  return sum / count;
}

/**
 * Compact stats under the grid — width follows the table, not the page.
 */
function GradeSummary({
  exams,
  students,
}: {
  classId: string;
  exams: ExamColumn[];
  students: StudentRow[];
}) {
  const summary = useMemo(() => {
    const avgs: number[] = [];
    for (const student of students) {
      const row: GridRow = {
        id: student.id,
        name: studentName(student),
        student: studentName(student),
      };
      for (const exam of exams)
        row[exam.id] = exam.grades[student.id]?.mark ?? null;
      const pct = computeRowAverage(exams, row);
      if (pct !== null) avgs.push(pct);
    }

    if (avgs.length === 0) return null;

    const sum = avgs.reduce((acc, v) => acc + v, 0);
    const mean = sum / avgs.length;
    const pass = avgs.filter((v) => Math.round(v) >= 70).length;
    return {
      avg: mean,
      passRate: (pass / avgs.length) * 100,
      max: Math.max(...avgs),
      min: Math.min(...avgs),
      passCount: pass,
      gradedCount: avgs.length,
    };
  }, [exams, students]);

  if (!summary) return null;

  const studentHint =
    summary.gradedCount === 1
      ? "1 con nota"
      : `${summary.gradedCount} con nota`;

  return (
    <div className="mt-3 flex w-full divide-x divide-border overflow-hidden rounded-xl border border-border/80 bg-surface-muted/30 shadow-sm">
      <SummaryStat
        label="Promedio"
        value={summary.avg}
        hint={studentHint}
        icon={<ChartSpline className="h-3.5 w-3.5" aria-hidden />}
      />
      <SummaryStat
        label="Aprobación"
        value={summary.passRate}
        hint={`${summary.passCount} de ${summary.gradedCount}`}
        icon={<ChartPie className="h-3.5 w-3.5" aria-hidden />}
      />
      <SummaryStat
        label="Máximo"
        value={summary.max}
        hint="Mejor promedio"
        icon={<ArrowUpRight className="h-3.5 w-3.5" aria-hidden />}
        tone="good"
      />
      <SummaryStat
        label="Mínimo"
        value={summary.min}
        hint="Más bajo"
        icon={<ArrowDownRight className="h-3.5 w-3.5" aria-hidden />}
        tone={summary.min >= 70 ? "neutral" : "low"}
      />
    </div>
  );
}

function SummaryStat({
  icon,
  label,
  value,
  hint,
  tone = "neutral",
}: {
  icon: ReactNode;
  label: string;
  value: number;
  hint: string;
  tone?: "neutral" | "good" | "low";
}) {
  const valueTone =
    tone === "good"
      ? "text-emerald-700 dark:text-emerald-300"
      : tone === "low"
        ? "text-violet-700 dark:text-violet-300"
        : "text-foreground";

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1 px-3 py-2.5 sm:px-4 sm:py-3">
      <div className="flex items-center gap-1.5 text-xs font-medium text-foreground/50">
        <span className="text-foreground/35">{icon}</span>
        <span>{label}</span>
      </div>
      <p className={`text-xl font-bold tabular-nums leading-none tracking-tight ${valueTone}`}>
        {Math.round(value)}%
      </p>
      <p className="text-[11px] font-medium leading-snug text-foreground/42">{hint}</p>
    </div>
  );
}
