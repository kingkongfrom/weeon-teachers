"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { HandHeart, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocale, useT } from "@/lib/i18n/client";
import { schoolPeriodLabel } from "@/lib/dashboard/school-period";
import type { EducationalSupport } from "@/lib/educational-supports/model";
import { acknowledgeStudentEducationalSupports } from "@/lib/teachers/educational-support-actions";

export function EducationalSupportReviewDialog({
  open,
  studentId,
  classId,
  studentName,
  supports,
  onClose,
  onAcknowledged,
}: {
  open: boolean;
  studentId: string;
  classId?: string;
  studentName: string;
  supports: EducationalSupport[];
  onClose: () => void;
  onAcknowledged?: () => void;
}) {
  const t = useT();
  const locale = useLocale();
  const copy = t.educationalSupports;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setError(null);
      setSaving(false);
    }
  }, [open]);

  async function handleAcknowledge() {
    setSaving(true);
    setError(null);
    const res = await acknowledgeStudentEducationalSupports({ studentId, classId });
    setSaving(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    onAcknowledged?.();
    onClose();
  }

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm"
          onClick={onClose}
          role="presentation"
        >
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="flex max-h-[min(90vh,640px)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl"
            role="dialog"
            aria-labelledby="support-review-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-wide text-brand-600 dark:text-brand-300">
                  {copy.badgeLabel}
                </p>
                <h2 id="support-review-title" className="mt-1 text-lg font-bold text-foreground">
                  {studentName}
                </h2>
                <p className="mt-1 text-sm font-medium text-foreground/55">{copy.reviewHint}</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label={t.common.close}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-foreground/45 transition-colors hover:bg-surface-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              {supports.length === 0 ? (
                <p className="text-sm font-medium text-foreground/50">{copy.empty}</p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {supports.map((item) => (
                    <li
                      key={item.id}
                      className="rounded-xl border border-border bg-surface-muted/20 px-4 py-3"
                    >
                      <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-brand-700 dark:bg-brand-950/40 dark:text-brand-300">
                        {copy.categories[item.category]}
                      </span>
                      <p className="mt-2 text-sm font-bold text-foreground">{item.title}</p>
                      <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-foreground/70">
                        {item.description}
                      </p>
                      {item.effectiveFrom || item.effectiveUntil ? (
                        <p className="mt-2 text-xs font-medium text-foreground/45">
                          {formatRange(item.effectiveFrom, item.effectiveUntil, locale, {
                            periodStartOpen: copy.periodStartOpen,
                            periodEndOpen: copy.periodEndOpen,
                          })}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="border-t border-border px-5 py-4">
              {error ? <p className="mb-3 text-xs font-semibold text-error">{error}</p> : null}
              <button
                type="button"
                disabled={saving || supports.length === 0}
                onClick={() => void handleAcknowledge()}
                className={cn(
                  "inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-brand-600 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-50",
                )}
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <HandHeart className="h-4 w-4" />}
                {copy.acknowledge}
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}

function formatRange(
  from: string | null,
  until: string | null,
  locale: string,
  labels: { periodStartOpen: string; periodEndOpen: string },
): string {
  const fromLabel = from ? schoolPeriodLabel(from, locale as "es" | "en") || from : labels.periodStartOpen;
  const untilLabel = until ? schoolPeriodLabel(until, locale as "es" | "en") || until : labels.periodEndOpen;
  return `${fromLabel} — ${untilLabel}`;
}
