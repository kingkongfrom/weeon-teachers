"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, ChevronLeft, ChevronRight, Loader2, Settings2, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLiveT } from "@/lib/i18n/client";
import type { ExamColumn } from "@/lib/dashboard/exams";
import { saveGrade } from "@/lib/teachers/exams-actions";

export type SheetColumn = {
  id: string;
  /** Column title already shortened for a narrow screen. */
  label: string;
  /** Rubro name, so the list reads grouped like the matrix. */
  rubro: string | null;
  points: number;
  /** Current mark, or null when ungraded. */
  mark: number | null;
  closed: boolean;
};

type Props = {
  open: boolean;
  studentId: string;
  studentName: string;
  columns: SheetColumn[];
  /** FINAL percent, recomputed by the parent after each save. */
  final: number | null;
  classId: string;
  /** Index of the student in the visible list, for prev/next. */
  position: { index: number; total: number };
  markView: "points" | "percent";
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  /** Called after a successful save so the parent can refetch. */
  onSaved: () => void;
  /**
   * Removes a column. The parent owns the confirmation and the server action,
   * exactly as in the matrix, so a phone delete is the same write with the same
   * safeguards — only the entry point differs.
   */
  onDeleteColumn?: (columnId: string) => void;
};

/**
 * Phone grade entry — one student, one sheet.
 *
 * Why a sheet and not the table: a 390 px screen cannot show a rubro block plus
 * a usable input per column without horizontal scrolling, and horizontal
 * scrolling while typing is the thing that makes mobile grading feel broken.
 * Here each column gets a full-width row, the number is large enough for a
 * thumb, and the student's FINAL updates as you go — so the teacher sees the
 * consequence of the mark while entering it, which the table never shows.
 *
 * The sheet is a *lens* on the same `saveGrade` action as the matrix: no new
 * write path, no new rules, identical validation.
 */
export function GradingSheet({
  open,
  studentId,
  studentName,
  columns,
  final,
  classId,
  position,
  markView,
  onClose,
  onPrev,
  onNext,
  onSaved,
  onDeleteColumn,
}: Props) {
  const t = useLiveT();
  const gs = t.gradebook.mobile;

  /** Draft marks keyed by column id; `undefined` = untouched. */
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedCount, setSavedCount] = useState(0);
  /** Column manager: delete lives behind one deliberate tap. */
  const [manageColumns, setManageColumns] = useState(false);
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});

  // A different student is a different set of marks: drop the drafts.
  useEffect(() => {
    if (!open) return;
    setDrafts({});
    setError(null);
    setSavedCount(0);
    setManageColumns(false);
  }, [open, studentName, studentId]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  const pendingChanges = useMemo(
    () =>
      columns.filter((column) => {
        const draft = drafts[column.id];
        if (draft === undefined) return false;
        const value = draft.trim() === "" ? null : Number(draft.replace(",", "."));
        return value !== column.mark;
      }),
    [columns, drafts],
  );

  function draftValue(column: SheetColumn): string {
    const draft = drafts[column.id];
    if (draft !== undefined) return draft;
    return column.mark == null ? "" : String(column.mark);
  }

  function setDraft(columnId: string, value: string) {
    setDrafts((current) => ({ ...current, [columnId]: value }));
    setError(null);
  }

  async function commit(column: SheetColumn, advance = false) {
    const raw = draftValue(column).trim();
    const value = raw === "" ? null : Number(raw.replace(",", "."));
    if (value != null && (!Number.isFinite(value) || value < 0)) {
      setError(t.gradebook.invalidMark);
      return;
    }
    if (value != null && value > column.points) {
      // Over the max is allowed by the data model, but a phone typo usually is
      // not, so the sheet says so instead of silently storing 100/10.
      setError(gs.overMax(column.points));
      return;
    }
    if (value === column.mark) {
      setDrafts((current) => {
        const next = { ...current };
        delete next[column.id];
        return next;
      });
      if (advance) focusNext(column.id);
      return;
    }

    setSavingId(column.id);
    const res = await saveGrade({
      classId,
      assignmentId: column.id,
      studentId,
      mark: value,
      maxMarks: column.points,
    });
    setSavingId(null);
    if (!res.ok) {
      setError(res.error ?? t.gradebook.saveError);
      return;
    }
    setDrafts((current) => {
      const next = { ...current };
      delete next[column.id];
      return next;
    });
    setSavedCount((count) => count + 1);
    onSaved();
    if (advance) focusNext(column.id);
  }

  /** Enter saves and moves to the next column, so a whole student is one pass. */
  function focusNext(columnId: string) {
    const index = columns.findIndex((column) => column.id === columnId);
    const next = columns[index + 1];
    if (next) inputs.current[next.id]?.focus();
  }

  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-[95] flex flex-col">
          <motion.button
            type="button"
            aria-label={t.common.close}
            onClick={onClose}
            className="absolute inset-0 bg-[#10201d]/40 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={gs.gradeStudent(studentName)}
            className="relative z-10 mt-auto flex max-h-sheet flex-col overflow-hidden rounded-t-[1.75rem] bg-surface pb-[env(safe-area-inset-bottom)] shadow-[0_-16px_48px_-16px_rgb(16_32_29/0.4)]"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.35 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 120) onClose();
            }}
          >
            <span
              aria-hidden
              className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-foreground/15"
            />

            <header className="flex items-start gap-3 px-5 pb-3 pt-3">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-foreground/40">
                  {gs.studentOf(position.index + 1, position.total)}
                </p>
                <h2 className="truncate text-[17px] font-bold text-foreground">
                  {studentName}
                </h2>
              </div>
              <div className="flex shrink-0 items-center gap-0.5">
                <button
                  type="button"
                  onClick={onPrev}
                  disabled={position.index === 0}
                  aria-label={gs.previousStudent}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-foreground/50 active:bg-surface-muted disabled:opacity-25"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={onNext}
                  disabled={position.index >= position.total - 1}
                  aria-label={gs.nextStudent}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-foreground/50 active:bg-surface-muted disabled:opacity-25"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label={t.common.close}
                  className="ml-1 flex h-9 w-9 items-center justify-center rounded-full text-foreground/40 active:bg-surface-muted"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </header>

            <div className="flex items-center justify-between gap-3 border-y border-border bg-surface-muted/50 px-5 py-2">
              <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-foreground/45">
                {gs.finalNow}
              </span>
              <span
                className={cn(
                  "rounded-lg px-2.5 py-1 text-lg font-bold leading-none tabular-nums",
                  final == null ? "text-foreground/30" : finalTone(final),
                )}
              >
                {final == null ? "—" : `${final}%`}
              </span>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3">
              <ul className="flex flex-col gap-2">
                {columns.map((column) => {
                  const value = draftValue(column);
                  const numeric = value.trim() === "" ? null : Number(value.replace(",", "."));
                  const percent =
                    numeric != null && column.points > 0
                      ? Math.round((numeric / column.points) * 100)
                      : null;
                  const dirty = pendingChanges.some((item) => item.id === column.id);

                  return (
                    <li
                      key={column.id}
                      className={cn(
                        "flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors",
                        "has-[:focus]:border-[#0891B2]/50 has-[:focus]:bg-[#0891B2]/[0.05]",
                        dirty
                          ? "border-[#0891B2]/40 bg-[#0891B2]/[0.04]"
                          : "border-border bg-surface",
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[14px] font-semibold text-foreground">
                          {column.label}
                        </p>
                        <p className="mt-0.5 flex items-center gap-1.5 text-[11px] font-medium text-foreground/45">
                          {column.closed ? (
                            <span className="rounded bg-surface-muted px-1 text-[10px] font-bold uppercase tracking-wide">
                              {gs.closed}
                            </span>
                          ) : null}
                          <span className="tabular-nums">
                            {markView === "percent" && percent != null
                              ? `${percent}%`
                              : `${column.points} pts`}
                          </span>
                          {column.rubro ? (
                            <>
                              <span className="text-foreground/25">·</span>
                              <span className="truncate">{column.rubro}</span>
                            </>
                          ) : null}
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        {savingId === column.id ? (
                          <Loader2 className="h-4 w-4 animate-spin text-foreground/40" />
                        ) : null}
                        <input
                          ref={(element) => {
                            inputs.current[column.id] = element;
                          }}
                          value={value}
                          onChange={(event) => setDraft(column.id, event.target.value)}
                          onFocus={(event) => event.currentTarget.select()}
                          onBlur={() => void commit(column)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.preventDefault();
                              void commit(column, true);
                            }
                          }}
                          inputMode="decimal"
                          enterKeyHint="next"
                          aria-label={gs.markFor(column.label, column.points)}
                          placeholder="—"
                          className={cn(
                            "h-11 w-16 rounded-xl border bg-background text-center text-[17px] font-bold tabular-nums text-foreground outline-none transition-[border-color,box-shadow]",
                            "focus:border-[#0891B2] focus:bg-surface focus:shadow-[0_0_0_3px_rgb(8_145_178/0.15)]",
                            dirty ? "border-[#0891B2]/50" : "border-border",
                          )}
                        />
                        <span className="w-9 text-right text-[11px] font-bold tabular-nums text-foreground/45">
                          {percent == null ? "" : `${percent}%`}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>

              {columns.length === 0 ? (
                <p className="px-2 py-10 text-center text-sm font-medium text-foreground/45">
                  {gs.noColumns}
                </p>
              ) : null}

              <div className="mt-3 flex items-center justify-between gap-2">
                {onDeleteColumn && columns.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => setManageColumns((open) => !open)}
                    aria-expanded={manageColumns}
                    className={cn(
                      "inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[12.5px] font-semibold transition-colors active:bg-surface-muted",
                      manageColumns ? "text-foreground" : "text-foreground/45",
                    )}
                  >
                    <Settings2 className="h-3.5 w-3.5" />
                    {gs.manageColumns}
                  </button>
                ) : (
                  <span />
                )}
                {savedCount > 0 ? (
                  <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#0f766e] dark:text-[#6ee7d7]">
                    <Check className="h-3.5 w-3.5" />
                    {gs.savedCount(savedCount)}
                  </span>
                ) : null}
              </div>

              {/*
               * Deleting a column lives here rather than on the row: it is a
               * rare, destructive action and it belongs behind one deliberate
               * tap, not next to every mark a thumb is entering. The parent owns
               * the confirm dialog and the server action.
               */}
              {manageColumns && onDeleteColumn ? (
                <ul className="mt-2 flex flex-col gap-1 rounded-xl border border-border bg-surface-muted/40 p-1.5">
                  {columns.map((column) => (
                    <li
                      key={column.id}
                      className="flex items-center justify-between gap-2 rounded-lg bg-surface px-2.5 py-1.5"
                    >
                      <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-foreground/75">
                        {column.label}
                      </span>
                      <button
                        type="button"
                        onClick={() => onDeleteColumn(column.id)}
                        className="inline-flex h-7 shrink-0 items-center gap-1 rounded-full px-2 text-[11.5px] font-bold text-error/80 active:bg-error/10"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        {gs.deleteColumn}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}

              {error ? (
                <p
                  role="alert"
                  className="mt-2 rounded-xl border border-error/25 bg-error/5 px-3 py-2 text-[12.5px] font-medium text-error"
                >
                  {error}
                </p>
              ) : null}
            </div>

            <div className="border-t border-border px-5 py-3">
              <button
                type="button"
                onClick={onClose}
                className="h-11 w-full rounded-full bg-foreground text-[14px] font-semibold text-background active:scale-[0.99]"
              >
                {gs.done}
              </button>
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}

function finalTone(value: number): string {
  if (value >= 70) return "bg-[#abe3dc] text-[#0f4c47] dark:bg-[#0f2f2c] dark:text-[#6ee7d7]";
  if (value >= 50) return "bg-[#fdeecd] text-[#92400e] dark:bg-[#3a2a12] dark:text-[#fde68a]";
  return "bg-[#fbdee7] text-[#9f1239] dark:bg-[#3a1622] dark:text-[#fda4af]";
}
