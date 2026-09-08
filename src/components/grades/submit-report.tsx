"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Check, FileCheck2, Loader2, X } from "lucide-react";
import { submitClassReport } from "@/lib/teachers/reports-actions";

type SubmitReportProps = {
  classId: string;
  subjectId?: string | null;
  disabled: boolean;
};

/**
 * "Subir reporte" button below a group. On click it opens a confirm dialog
 * (deliberately using the brand color for the confirm action, never red) and
 * only calls the server action once the teacher confirms.
 */
export function SubmitReport({ classId, subjectId = null, disabled }: SubmitReportProps) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    if (busy) return;
    setBusy(true);
    setError(null);
    const result = await submitClassReport({ classId, subjectId });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <div className="inline-flex items-center gap-2 rounded-lg border border-success/40 bg-success/10 px-4 py-2 text-sm font-medium text-success">
        <Check className="h-4 w-4" />
        Reporte subido
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          setError(null);
        }}
        disabled={disabled}
        aria-label="Subir reporte del grupo"
        className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
      >
        <FileCheck2 className="h-4 w-4" />
        Subir reporte
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            role="presentation"
            onClick={() => {
              if (!busy) setOpen(false);
            }}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="submit-report-title"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              onClick={(event) => event.stopPropagation()}
              className="w-full max-w-sm rounded-2xl border border-border bg-surface p-6 shadow-xl"
            >
              <h2 id="submit-report-title" className="text-lg font-semibold text-foreground">
                Subir reporte del grupo
              </h2>
              <p className="mt-2 text-sm text-foreground/60">
                Se enviará el listado de calificaciones actual del grupo y aparecerá en la
                página Reportes. ¿Desea continuar?
              </p>

              {error ? (
                <p className="mt-3 text-xs font-medium text-error">{error}</p>
              ) : null}

              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  disabled={busy}
                  className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-foreground/70 transition-colors hover:bg-surface-muted disabled:opacity-50"
                >
                  <X className="h-4 w-4" />
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => void handleConfirm()}
                  disabled={busy}
                  className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg bg-brand-600 px-4 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-60"
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  {busy ? "Enviando…" : "Confirmar"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
