"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Download,
  Gamepad2,
  Loader2,
  PencilLine,
  Plus,
  Share2,
  Trash2,
} from "lucide-react";
import { useLiveT } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";
import { SelectMenu } from "@/components/ui/select-menu";
import { BlooketShareDialog } from "@/components/blooket/blooket-share-dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  deleteBlooketSet,
  loadBlooketSet,
  type SavedBlooketSet,
} from "@/lib/teachers/blooket-actions";
import { blooketFileName, toBlooketCsv } from "@/lib/assessments/blooket-csv";

/** Safe download name — same rule the builder uses. */
function fileName(title: string): string {
  return blooketFileName(title || "Weeon");
}

/**
 * The saved Blooket sets, as a library "collection".
 *
 * A set is not an assessment (no points, no grading), so it has its own table
 * and its own listing. Mis evaluaciones renders this as the «Blookets»
 * collection so stored sets have a home outside the builder: reopen, share,
 * download or delete from there. The builder reuses the same list in `manage`
 * mode to show what Save has stored so far.
 */
export function BlooketSetsList({
  sets,
  onOpen,
  onChanged,
  variant = "collection",
}: {
  sets: SavedBlooketSet[];
  /** Builder only: loads the rows back into the editor. */
  onOpen?: (id: string) => void;
  /** Called after a write (delete / share) so the host list reloads. */
  onChanged?: () => void;
  /** `collection`: full card used by Mis evaluaciones. `manage`: compact list. */
  variant?: "collection" | "manage";
}) {
  const t = useLiveT();
  const l = t.library.blooket;

  const [gradeFilter, setGradeFilter] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [shareTarget, setShareTarget] = useState<SavedBlooketSet | null>(null);
  /**
   * The set awaiting deletion confirmation.
   *
   * This used to be `window.confirm`, which is a browser-drawn dialog: it
   * ignores the app's styling, cannot be themed or translated the same way, and
   * looks like a system error rather than an app action. `ConfirmDialog` is the
   * house component for exactly this, and its own docblock says it exists to
   * replace `window.confirm`.
   */
  const [deleteTarget, setDeleteTarget] = useState<SavedBlooketSet | null>(null);

  const grades = useMemo(() => {
    const seen = new Set<string>();
    for (const saved of sets) {
      const level = saved.gradeLevel?.trim();
      if (level) seen.add(level);
    }
    return [...seen].sort((a, b) => a.localeCompare(b, "es", { numeric: true }));
  }, [sets]);

  const visible = useMemo(
    () => (gradeFilter ? sets.filter((saved) => saved.gradeLevel === gradeFilter) : sets),
    [sets, gradeFilter],
  );

  async function remove(saved: SavedBlooketSet) {
    setBusyId(saved.id);
    setError(null);
    const res = await deleteBlooketSet(saved.id);
    setBusyId(null);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setDeleteTarget(null);
    onChanged?.();
  }

  /**
   * Rebuilds the CSV from the stored rows through the shared exporter, so a set
   * shared by a colleague can go to Blooket without entering the editor.
   */
  async function download(saved: SavedBlooketSet) {
    setBusyId(saved.id);
    setError(null);
    const res = await loadBlooketSet(saved.id);
    if (!res.ok || !res.set) {
      setBusyId(null);
      setError(res.error ?? l.downloadFailed);
      return;
    }
    const csv = toBlooketCsv(
      { title: res.set.title, rows: res.set.rows, skipped: [] },
      { includeTitleRow: true },
    );
    const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName(res.set.title);
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    setBusyId(null);
  }

  const filter = grades.length > 0 ? (
    <div className="w-40">
      <SelectMenu
        value={gradeFilter}
        onChange={setGradeFilter}
        options={[
          { value: "", label: l.allLevels },
          ...grades.map((level) => ({ value: level, label: level })),
        ]}
        label={l.filterByLevel}
        variant="pill"
      />
    </div>
  ) : null;

  return (
    <div className="flex flex-col gap-3">
      {error ? (
        <p
          role="alert"
          className="rounded-xl border border-error/25 bg-error/5 px-3 py-2 text-[13px] font-medium text-error"
        >
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-foreground/50">
          <Gamepad2 className="h-4 w-4" />
          {t.library.blooket.collectionTitle}
          <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[11px] font-bold tabular-nums text-foreground/50">
            {sets.length}
          </span>
        </h3>
        <div className="flex items-center gap-2">
          {filter}
          {/* The collection lives inside Mis evaluaciones, which already has the
              primary «Crear set de Blooket» action; a second one belongs only in
              the builder's manage list. */}
          {variant === "manage" && sets.length > 0 ? (
            <Link
              href="/aula-virtual/blooket"
              className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border px-3 text-[12.5px] font-semibold text-foreground/70 transition-colors hover:bg-surface-muted hover:text-foreground"
            >
              <Plus className="h-3.5 w-3.5" />
              {t.library.blooketAction}
            </Link>
          ) : null}
        </div>
      </div>

      {sets.length === 0 ? (
        /*
         * ONE QUIET LINE when there is nothing stored.
         *
         * This used to be a dashed box with an icon, a title, a sentence of
         * explanation and its own row height — nearly as tall as the assessment
         * cards below it, so "you have no Blooket sets" outranked the work the
         * teacher actually came for. The feature stays discoverable: the label
         * and the action are still here, just not shouting.
         */
        <div className="flex flex-wrap items-center gap-2 py-1">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-100 dark:bg-brand-950/40 dark:text-brand-300 dark:ring-brand-900">
            <Gamepad2 className="h-3.5 w-3.5" />
          </span>
          <p className="min-w-0 flex-1 truncate text-[12.5px] text-foreground/50">{l.empty.title}</p>
          <Link
            href="/aula-virtual/blooket"
            className="inline-flex h-7 shrink-0 items-center gap-1 rounded-full px-2.5 text-[12px] font-semibold text-brand-700 transition-colors hover:bg-brand-50 dark:text-brand-300 dark:hover:bg-brand-950/40"
          >
            <Plus className="h-3.5 w-3.5" />
            {l.empty.action ?? t.library.blooketAction}
          </Link>
        </div>
      ) : (
        <ul
          className={cn(
            "flex flex-col divide-y divide-border",
            variant === "collection" && sets.length > 0 && "rounded-xl border border-border px-4",
          )}
        >
          {visible.map((saved) => (
            <li
              key={saved.id}
              className="flex flex-wrap items-center gap-2 py-2.5 first:pt-0 last:pb-0"
            >
              <div className="min-w-0 flex-1">
                <span className="block truncate text-[13.5px] font-semibold text-foreground">
                  {saved.title}
                </span>
                <span className="text-[11.5px] text-foreground/50">
                  {saved.questionCount}{" "}
                  {saved.questionCount === 1 ? l.questionOne : l.questionMany}
                  {saved.gradeLevel ? ` · ${saved.gradeLevel}` : ""}
                  {saved.shared
                    ? ` · ${l.sharedBy(saved.sharedByName || l.sharedByFallback)}`
                    : ""}
                </span>
              </div>

              <button
                type="button"
                onClick={() => void download(saved)}
                disabled={busyId === saved.id}
                aria-label={l.download(saved.title)}
                title={l.downloadTitle}
                className="flex h-7 w-7 items-center justify-center rounded-md text-foreground/35 hover:bg-surface-muted hover:text-foreground disabled:opacity-50"
              >
                {busyId === saved.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="h-3.5 w-3.5" />
                )}
              </button>

              {onOpen ? (
                <button
                  type="button"
                  onClick={() => onOpen(saved.id)}
                  aria-label={`${l.openTitle}: ${saved.title}`}
                  title={l.openTitle}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-foreground/35 hover:bg-surface-muted hover:text-foreground"
                >
                  <PencilLine className="h-3.5 w-3.5" />
                </button>
              ) : saved.shared ? null : (
                <Link
                  href={`/aula-virtual/blooket?set=${saved.id}`}
                  aria-label={l.edit(saved.title)}
                  title={l.editTitle}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-foreground/35 hover:bg-surface-muted hover:text-foreground"
                >
                  <PencilLine className="h-3.5 w-3.5" />
                </Link>
              )}

              {saved.shared ? null : (
                <>
                  <button
                    type="button"
                    onClick={() => setShareTarget(saved)}
                    aria-label={l.share(saved.title)}
                    title={l.shareTitle}
                    className="flex h-7 w-7 items-center justify-center rounded-md text-foreground/35 hover:bg-surface-muted hover:text-foreground"
                  >
                    <Share2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(saved)}
                    disabled={busyId === saved.id}
                    aria-label={l.delete(saved.title)}
                    title={l.deleteTitle}
                    className="flex h-7 w-7 items-center justify-center rounded-md text-foreground/35 hover:bg-error/10 hover:text-error disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </>
              )}
            </li>
          ))}
          {visible.length === 0 ? (
            <li className="py-3 text-center text-[13px] text-foreground/45">{l.noMatch}</li>
          ) : null}
        </ul>
      )}

      <BlooketShareDialog
        open={shareTarget !== null}
        set={shareTarget}
        onClose={() => {
          setShareTarget(null);
          onChanged?.();
        }}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        title={l.deleteTitle}
        description={deleteTarget ? l.deleteConfirm(deleteTarget.title) : undefined}
        confirmLabel={t.gradebook.confirmYes}
        cancelLabel={t.common.cancel}
        pending={busyId !== null && deleteTarget !== null && busyId === deleteTarget.id}
        onConfirm={() => {
          if (deleteTarget) void remove(deleteTarget);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
