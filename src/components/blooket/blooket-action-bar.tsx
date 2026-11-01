"use client";

import { useEffect, useRef } from "react";
import { Check, Download, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Sticky action bar for the Blooket builder.
 *
 * The builder grows as questions are added, so a Save at the top of the page is
 * out of sight exactly when the set first becomes worth keeping. This bar docks
 * to the bottom edge (above the home indicator on mobile) and carries the two
 * things done at the end of an editing session: keep the set, or take the CSV.
 *
 * It never floats over an empty screen: it only mounts while anything is
 * exportable, and it reports *why* Save is disabled instead of leaving a dead
 * button. `--pwa-bottom-inset`, when the host defines one, keeps it clear of a
 * fixed footer without guessing a magic number.
 */
export function BlooketActionBar({
  canSave,
  canExport,
  saving,
  exporting,
  savedRecently,
  currentSetId,
  rowCount,
  totalCount,
  missingTitle,
  onSave,
  onDownload,
}: {
  canSave: boolean;
  canExport: boolean;
  saving: boolean;
  exporting: boolean;
  savedRecently: boolean;
  currentSetId: string | null;
  rowCount: number;
  totalCount: number;
  /** True while the set has questions but still no name to file it under. */
  missingTitle: boolean;
  onSave: () => void;
  onDownload: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  // The builder page uses the document as its scroll container, but a host may
  // wrap it in an inner scroll box; measuring the bar keeps the last card
  // reachable either way.
  useEffect(() => {
    const bar = ref.current;
    if (!bar) return;
    const root = document.documentElement;
    const update = () => {
      root.style.setProperty("--blooket-action-bar-h", `${bar.offsetHeight}px`);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(bar);
    return () => {
      observer.disconnect();
      root.style.removeProperty("--blooket-action-bar-h");
    };
  }, []);

  if (rowCount === 0) return null;

  return (
    <div
      ref={ref}
      className={cn(
        "sticky bottom-3 z-30 mx-auto w-full max-w-3xl",
        "pb-[var(--pwa-bottom-inset,0px)]",
      )}
    >
      <div
        className={cn(
          "flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-border bg-surface px-3 py-2.5",
        )}
      >
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-foreground">
            {missingTitle ? (
              "Póngale nombre para guardar el set"
            ) : savedRecently ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                Set guardado
              </>
            ) : currentSetId ? (
              "Cambios sin guardar"
            ) : (
              "Set listo"
            )}
          </span>
          <span className="truncate text-[11.5px] font-medium tabular-nums text-foreground/45">
            {rowCount} de {totalCount}{" "}
            {totalCount === 1 ? "pregunta exportable" : "preguntas exportables"}
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={onDownload}
            disabled={!canExport || exporting}
          >
            {exporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">Descargar CSV</span>
            <span className="sm:hidden">CSV</span>
          </Button>
          <Button size="sm" onClick={onSave} disabled={!canSave || saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {currentSetId ? "Actualizar set" : "Guardar set"}
          </Button>
        </div>
      </div>
    </div>
  );
}
