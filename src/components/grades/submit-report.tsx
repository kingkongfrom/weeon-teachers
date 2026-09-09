"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { ArrowRight, Check, FileCheck2, Loader2, X } from "lucide-react";
import { submitClassReport } from "@/lib/teachers/reports-actions";

type SubmitReportProps = {
  classId: string;
  subjectId?: string | null;
  /** Display name of the active materia — scopes copy to this subject, not the whole group. */
  subjectName?: string | null;
  disabled: boolean;
  /** Full-width table footer row — matches the gradebook header height. */
  variant?: "default" | "footer";
};

function submitLabel(subjectName?: string | null): string {
  return subjectName ? `Subir reporte — ${subjectName}` : "Subir reporte";
}

/**
 * "Subir reporte" button below a group. On click it opens a confirm dialog
 * (deliberately using the brand color for the confirm action, never red) and
 * only calls the server action once the teacher confirms.
 */
export function SubmitReport({
  classId,
  subjectId = null,
  subjectName = null,
  disabled,
  variant = "default",
}: SubmitReportProps) {
  const isFooter = variant === "footer";
  const label = submitLabel(subjectName);
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
    setOpen(false);
    setDone(true);
  }

  if (done) {
    const successBody = (
      <>
        <Check className="h-4 w-4 shrink-0" />
        <span>Reporte subido</span>
        <ArrowRight className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
        <span>Ver en Reportes</span>
      </>
    );

    if (isFooter) {
      return (
        <Link
          href="/reportes"
          className="flex h-full w-full items-center justify-center gap-2 bg-success/10 text-sm font-medium text-success transition-colors hover:bg-success/15"
        >
          {successBody}
        </Link>
      );
    }

    return (
      <Link
        href="/reportes"
        className="inline-flex items-center gap-2 rounded-lg border border-success/40 bg-success/10 px-4 py-2 text-sm font-medium text-success transition-colors hover:bg-success/15"
      >
        {successBody}
      </Link>
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
        aria-label={label}
        className={
          isFooter
            ? "flex h-full w-full cursor-pointer items-center justify-center gap-2 bg-brand-600 px-3 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500/40"
            : "inline-flex cursor-pointer items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
        }
      >
        <FileCheck2 className="h-4 w-4 shrink-0" />
        <span className={isFooter ? "truncate" : undefined}>{label}</span>
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
                {label}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-foreground/60">
                {subjectName ? (
                  <>
                    Se publicará el listado de calificaciones de{" "}
                    <span className="font-semibold text-foreground/80">{subjectName}</span>{" "}
                    para este grupo. Aparecerá en la página Reportes. ¿Desea continuar?
                  </>
                ) : (
                  <>
                    Se publicará el listado de calificaciones actual de este grupo en la
                    página Reportes. ¿Desea continuar?
                  </>
                )}
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
