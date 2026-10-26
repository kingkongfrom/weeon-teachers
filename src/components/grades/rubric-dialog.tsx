"use client";

import { useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import { Check, Loader2, Plus, RotateCcw, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/client";
import {
  assignOrphanColumns,
  moveColumnToRubro,
  resetRubros,
  saveRubros,
} from "@/lib/teachers/exams-actions";
import type { ExamColumn, GradeRubro } from "@/lib/dashboard/exams";

type RubroRow = {
  key: string;
  id?: string;
  name: string;
  peso: number;
  archived: boolean;
  /** Which kind of column this rubro holds; drives publish routing. */
  defaultKind: "homework" | "exam" | null;
};

function toRows(rubros: GradeRubro[]): RubroRow[] {
  return [...rubros]
    .sort((a, b) => a.position - b.position || a.name.localeCompare(b.name, "es"))
    .map((rubro) => ({
      key: rubro.id,
      id: rubro.id,
      name: rubro.name,
      peso: rubro.peso,
      archived: rubro.archived,
      defaultKind: rubro.defaultKind ?? null,
    }));
}

/**
 * Rubric editor. In `wizard` mode it is the first-run two-step flow (weights,
 * then the column-points explanation); in `edit` mode it is the normal dialog,
 * including the column → category mover for columns without a category.
 */
export function RubricDialog({
  mode,
  subjectLabel,
  classId,
  subjectId,
  rubros,
  columns,
  onClose,
  onSaved,
}: {
  mode: "wizard" | "edit";
  subjectLabel: string | null;
  classId: string;
  subjectId: string;
  rubros: GradeRubro[];
  columns: ExamColumn[];
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}) {
  const t = useT();
  const w = t.gradebook.workspace;
  const copy = w.rubros;

  const nextKey = useRef(3);
  const [step, setStep] = useState(0);
  const [rows, setRows] = useState<RubroRow[]>(() => {
    if (mode === "wizard" && rubros.length === 0) {
      // Seed the conventional rubros with the kind they hold, so a published
      // exam routes to Exámenes instead of landing in the first rubro.
      return ["Tareas", "Exámenes", "Proyectos"].map((name, index) => ({
        key: `new-${index}`,
        name,
        peso: 0,
        archived: false,
        defaultKind: name === "Exámenes" ? ("exam" as const) : null,
      }));
    }
    return toRows(rubros);
  });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [movingId, setMovingId] = useState<string | null>(null);
  const [removed, setRemoved] = useState<RubroRow[]>([]);
  const [confirmReset, setConfirmReset] = useState(false);

  const activeRows = rows.filter((row) => !row.archived);
  const total = activeRows.reduce((sum, row) => sum + row.peso, 0);
  const columnCount = useMemo(() => {
    const counts = new Map<string, number>();
    for (const column of columns) {
      if (!column.rubroId) continue;
      counts.set(column.rubroId, (counts.get(column.rubroId) ?? 0) + 1);
    }
    return counts;
  }, [columns]);

  const canContinue =
    activeRows.some((row) => row.name.trim().length > 0 && row.peso > 0) &&
    rows.every((row) => row.name.trim().length > 0);

  function patchRow(key: string, patch: Partial<RubroRow>) {
    setRows((current) =>
      current.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    );
  }

  function addRow() {
    setRows((current) => [
      ...current,
      {
        key: `new-${nextKey.current++}`,
        name: "",
        peso: 0,
        archived: false,
        defaultKind: null,
      },
    ]);
  }

  function removeRow(row: RubroRow) {
    if (row.id && (columnCount.get(row.id) ?? 0) > 0) {
      setError(copy.hasColumns);
      return;
    }
    if (row.id) setRemoved((current) => [...current, row]);
    setRows((current) => current.filter((item) => item.key !== row.key));
  }

  function moveRow(key: string, direction: -1 | 1) {
    setRows((current) => {
      const index = current.findIndex((row) => row.key === key);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function distributeEvenly() {
    const active = rows.filter((row) => !row.archived);
    if (active.length === 0) return;
    const base = Math.floor(100 / active.length);
    const remainder = 100 - base * active.length;
    let index = 0;
    setRows((current) =>
      current.map((row) => {
        if (row.archived) return row;
        const peso = base + (index < remainder ? 1 : 0);
        index += 1;
        return { ...row, peso };
      }),
    );
  }

  async function save() {
    setError(null);
    if (!rows.every((row) => row.name.trim().length > 0)) {
      setError(t.gradebook.addError);
      return;
    }
    // A rubric must always split the whole final grade.
    if (total !== 100) {
      setError(copy.pesoWarning(total));
      return;
    }
    setPending(true);
    const res = await saveRubros({
      classId,
      subjectId,
      rubros: [
        ...rows.map((row, index) => ({
          id: row.id,
          name: row.name.trim(),
          peso: row.peso,
          position: index,
          archived: row.archived,
          defaultKind: row.defaultKind,
        })),
        ...removed
          .filter((row) => row.id)
          .map((row) => ({
            id: row.id,
            name: row.name,
            peso: row.peso,
            position: 0,
            remove: true,
          })),
      ],
    });
    setPending(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    if (mode === "wizard") {
      // Existing columns join the rubro that matches their kind, so the
      // teacher does not have to move them one by one. Failure here is not
      // fatal: the rubric is already saved and columns can be moved manually.
      await assignOrphanColumns({ classId, subjectId });
    }
    await onSaved();
    onClose();
  }

  async function reset() {
    setPending(true);
    setError(null);
    const res = await resetRubros({ classId, subjectId });
    setPending(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setConfirmReset(false);
    await onSaved();
    onClose();
  }

  async function moveColumn(assignmentId: string, rubroId: string) {
    setMovingId(assignmentId);
    const res = await moveColumnToRubro({ classId, assignmentId, rubroId });
    setMovingId(null);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    await onSaved();
  }

  function handlePrimary() {
    if (mode === "wizard" && step === 0) {
      setStep(1);
      return;
    }
    void save();
  }

  const title =
    mode === "wizard" && step === 0 ? copy.wizardTitle : copy.title;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center">
      {/* Backdrop is intentionally not clickable: closing is only via the X or
          Cancel, so an accidental outside click never loses the edits. */}
      <motion.div
        aria-hidden
        className="absolute inset-0 bg-black/40"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative z-10 flex max-h-sheet w-full max-w-2xl flex-col rounded-t-3xl bg-surface p-5 shadow-2xl sm:rounded-3xl"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 24 }}
        transition={{ type: "spring", stiffness: 380, damping: 34 }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h4 className="text-lg font-bold text-foreground">{title}</h4>
            {subjectLabel ? (
              <p className="mt-0.5 text-sm font-medium text-foreground/55">{subjectLabel}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={copy.close}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-foreground/70 transition-colors hover:bg-surface-muted hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-3 min-h-0 flex-1 overflow-y-auto pr-1">
          {mode === "wizard" && step === 0 ? (
            <p className="mb-3 text-sm text-foreground/65">{copy.wizardIntro}</p>
          ) : null}

          <p className="mb-3 rounded-xl bg-surface-muted/70 px-3 py-2 text-xs font-medium leading-relaxed text-foreground/60">
            {copy.pesoHint}
          </p>

          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-[minmax(0,1fr)_5rem_14rem] items-center gap-2 px-1 text-[11px] font-bold uppercase tracking-wide text-foreground/45">
              <span>{copy.name}</span>
              <span>{copy.peso}</span>
              <span />
            </div>

            {rows.map((row, index) => {
              const used = row.id ? (columnCount.get(row.id) ?? 0) : 0;
              return (
                <div
                  key={row.key}
                  className={cn(
                    "grid grid-cols-[minmax(0,1fr)_5rem_14rem] items-center gap-2 rounded-xl border border-border px-2 py-1.5",
                    row.archived && "opacity-60",
                  )}
                >
                  <input
                    value={row.name}
                    onChange={(event) => patchRow(row.key, { name: event.target.value })}
                    aria-label={copy.name}
                    maxLength={60}
                    placeholder={copy.name}
                    className="h-9 min-w-0 rounded-lg border border-transparent bg-transparent px-2 text-sm font-semibold text-foreground outline-none focus:border-brand-400 focus:bg-background"
                  />
                  <div className="relative">
                    <input
                      value={Number.isFinite(row.peso) ? String(row.peso) : ""}
                      onChange={(event) => {
                        const next = Number(event.target.value.replace(/[^\d]/g, ""));
                        patchRow(row.key, {
                          peso: Number.isNaN(next) ? 0 : Math.min(100, next),
                        });
                      }}
                      inputMode="numeric"
                      aria-label={copy.peso}
                      className="h-9 w-full rounded-lg border border-border bg-background px-2 pr-6 text-center text-sm font-bold tabular-nums text-foreground outline-none focus:border-brand-400"
                    />
                    <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs font-semibold text-foreground/40">
                      %
                    </span>
                  </div>
                  <div className="flex items-center justify-end gap-0.5">
                    {/* Tags the rubro so publishing a homework or an exam from
                        Aula virtual routes its column here instead of into the
                        first rubro. */}
                    <select
                      value={row.defaultKind ?? ""}
                      onChange={(event) => {
                        const value = event.target.value;
                        patchRow(row.key, {
                          defaultKind:
                            value === "homework" || value === "exam" ? value : null,
                        });
                      }}
                      aria-label={copy.rubroKind}
                      title={copy.rubroKindHint}
                      className={cn(
                        "h-8 rounded-lg border border-border bg-background px-1 text-[11px] font-semibold outline-none focus:border-brand-400",
                        row.defaultKind ? "text-brand-700 dark:text-brand-300" : "text-foreground/50",
                      )}
                    >
                      <option value="">{copy.rubroKindAny}</option>
                      <option value="homework">{copy.rubroKindHomework}</option>
                      <option value="exam">{copy.rubroKindExam}</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => moveRow(row.key, -1)}
                      disabled={index === 0}
                      aria-label={copy.move}
                      className="flex h-8 w-6 items-center justify-center rounded text-foreground/45 hover:text-foreground disabled:opacity-30"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => moveRow(row.key, 1)}
                      disabled={index === rows.length - 1}
                      aria-label={copy.move}
                      className="flex h-8 w-6 items-center justify-center rounded text-foreground/45 hover:text-foreground disabled:opacity-30"
                    >
                      ↓
                    </button>
                    {row.id ? (
                      <button
                        type="button"
                        onClick={() => patchRow(row.key, { archived: !row.archived })}
                        title={row.archived ? copy.unarchive : copy.archive}
                        className="flex h-8 w-[4.5rem] items-center justify-center rounded px-1.5 text-[11px] font-semibold text-foreground/50 hover:text-foreground"
                      >
                        {row.archived ? copy.unarchive : copy.archive}
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => removeRow(row)}
                      disabled={used > 0}
                      title={used > 0 ? copy.hasColumns : copy.delete}
                      aria-label={copy.delete}
                      className="flex h-8 w-6 items-center justify-center rounded text-error/60 hover:text-error disabled:opacity-30"
                    >
                      <X className="h-4 w-4" />
                    </button>
                    <span className="ml-1 w-[4.75rem] shrink-0 text-right text-[10px] font-semibold tabular-nums text-foreground/40">
                      {used > 0 ? copy.columnsCount(used) : ""}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={addRow}
              className="inline-flex h-8 items-center gap-1 rounded-full border border-border px-3 text-xs font-semibold text-foreground/70 ui-hover"
            >
              <Plus className="h-3.5 w-3.5" />
              {copy.add}
            </button>
            <button
              type="button"
              onClick={distributeEvenly}
              className="inline-flex h-8 items-center rounded-full border border-border px-3 text-xs font-semibold text-foreground/70 ui-hover"
            >
              {copy.distribute}
            </button>
            {mode === "edit" && rubros.length > 0 ? (
              <button
                type="button"
                onClick={() => setConfirmReset(true)}
                className="inline-flex h-8 items-center gap-1 rounded-full border border-error/30 px-3 text-xs font-semibold text-error/80 hover:bg-error/10"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                {copy.reset}
              </button>
            ) : null}
          </div>

          {confirmReset ? (
            <div className="mt-3 flex flex-col gap-2 rounded-xl border border-error/30 bg-error/10 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs font-semibold text-error">{copy.resetConfirm}</p>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmReset(false)}
                  className="inline-flex h-8 items-center rounded-lg border border-border px-3 text-xs font-semibold text-foreground/70"
                >
                  {t.gradebook.cancel}
                </button>
                <button
                  type="button"
                  onClick={() => void reset()}
                  disabled={pending}
                  className="inline-flex h-8 items-center gap-1 rounded-lg bg-error px-3 text-xs font-semibold text-white disabled:opacity-50"
                >
                  {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                  {copy.resetYes}
                </button>
              </div>
            </div>
          ) : null}

          <div className="mt-4 flex items-center justify-between rounded-xl border border-border bg-surface-muted/50 px-3 py-2 text-sm">
            <span className="font-semibold text-foreground/65">{copy.pesoTotal}</span>
            <span
              className={cn(
                "rounded-md px-2 py-0.5 font-bold tabular-nums",
                total === 100
                  ? "bg-[#abe3dc] text-[#0f4c47] dark:bg-[#0f2f2c] dark:text-[#6ee7d7]"
                  : "bg-[#fdeecd] text-[#92400e] dark:bg-[#3a2a12] dark:text-[#fde68a]",
              )}
            >
              {copy.pesoTotalValue(total)}
            </span>
          </div>
          {total !== 100 ? (
            <p className="mt-1 text-xs font-medium text-[#92400e] dark:text-[#fde68a]">
              {copy.pesoWarning(total)}
            </p>
          ) : null}

          {mode === "wizard" && step === 1 ? (
            <div className="mt-4 rounded-xl border border-border px-3 py-3">
              <p className="text-sm font-bold text-foreground">{copy.wizardStep2Title}</p>
              <p className="mt-1 text-xs font-medium leading-relaxed text-foreground/60">
                {copy.wizardStep2Body}
              </p>
              <p className="mt-1 text-xs font-medium leading-relaxed text-foreground/50">
                {copy.wizardStep2Auto}
              </p>
              {columns.length > 0 ? (
                <ul className="mt-2 flex flex-col gap-1">
                  {columns.slice(0, 8).map((column) => (
                    <li
                      key={column.id}
                      className="flex items-center justify-between text-xs font-medium text-foreground/60"
                    >
                      <span className="truncate">{column.title}</span>
                      <span className="tabular-nums">{column.points ?? 100} pts</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}

          {mode === "edit" && columns.length > 0 ? (
            <div className="mt-4 rounded-xl border border-border px-3 py-3">
              <p className="text-sm font-bold text-foreground">{copy.columns}</p>
              <div className="mt-2 flex flex-col gap-1.5">
                {columns.map((column) => (
                  <div
                    key={column.id}
                    className="flex items-center justify-between gap-2 text-xs font-medium text-foreground/65"
                  >
                    <span className="min-w-0 truncate">{column.title}</span>
                    <label className="flex items-center gap-1.5">
                      <span className="sr-only">{copy.moveColumn}</span>
                      <select
                        value={column.rubroId ?? ""}
                        disabled={movingId === column.id}
                        onChange={(event) =>
                          void moveColumn(column.id, event.target.value)
                        }
                        className="h-8 max-w-[11rem] rounded-lg border border-border bg-background px-2 text-xs font-semibold text-foreground"
                      >
                        <option value="" disabled>
                          {copy.columnRubro}
                        </option>
                        {rows
                          .filter((row) => row.id && !row.archived)
                          .map((row) => (
                            <option key={row.key} value={row.id}>
                              {row.name || copy.name}
                            </option>
                          ))}
                      </select>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {error ? (
            <p className="mt-3 rounded-lg border border-error/30 bg-error/10 px-3 py-2 text-sm font-medium text-error">
              {error}
            </p>
          ) : null}
        </div>

        <div className="mt-4 flex shrink-0 items-center justify-between gap-2">
          <div>
            {mode === "wizard" && step === 0 ? (
              <button
                type="button"
                onClick={onClose}
                className="text-sm font-semibold text-foreground/55 hover:text-foreground"
              >
                {copy.skip}
              </button>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 items-center justify-center rounded-xl border border-border px-4 text-sm font-semibold text-foreground/70 ui-hover"
            >
              {t.gradebook.cancel}
            </button>
            <button
              type="button"
              onClick={handlePrimary}
              disabled={
                pending ||
                (mode === "wizard" && step === 0 && !canContinue) ||
                (step === 1 || mode === "edit" ? total !== 100 : false)
              }
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-700 active:scale-[0.98] disabled:opacity-50"
            >
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              {mode === "wizard" && step === 0
                ? copy.continue
                : mode === "wizard"
                  ? copy.create
                  : copy.save}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
