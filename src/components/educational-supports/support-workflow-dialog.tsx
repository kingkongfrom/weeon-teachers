"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { ClipboardCheck, HandHeart, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocale, useT } from "@/lib/i18n/client";
import { schoolPeriodLabel } from "@/lib/dashboard/school-period";
import type {
  EducationalSupport,
  EducationalSupportRegistration,
  EducationalSupportRegistrationInput,
} from "@/lib/educational-supports/model";
import {
  acknowledgeStudentEducationalSupports,
  fetchEducationalSupportRegistration,
  saveEducationalSupportRegistration,
} from "@/lib/teachers/educational-support-actions";

type AppliedField =
  | "appliedPersonal"
  | "appliedCurricular"
  | "appliedAccess"
  | "appliedMethodology"
  | "appliedEvaluation";

const APPLIED_FIELDS: AppliedField[] = [
  "appliedPersonal",
  "appliedCurricular",
  "appliedAccess",
  "appliedMethodology",
  "appliedEvaluation",
];

export function EducationalSupportWorkflowDialog({
  open,
  studentId,
  classId,
  subjectId,
  conduct,
  subjectName,
  studentName,
  supports,
  needsReview,
  needsPeriodRegistration,
  onClose,
  onComplete,
}: {
  open: boolean;
  studentId: string;
  classId: string;
  subjectId?: string | null;
  conduct?: boolean;
  subjectName?: string | null;
  studentName: string;
  supports: EducationalSupport[];
  needsReview: boolean;
  needsPeriodRegistration: boolean;
  onClose: () => void;
  onComplete?: (patch: { needsReview?: boolean; needsPeriodRegistration?: boolean }) => void;
}) {
  const t = useT();
  const locale = useLocale();
  const copy = t.educationalSupports;
  const [ackSaving, setAckSaving] = useState(false);
  const [regSaving, setRegSaving] = useState(false);
  const [loadingReg, setLoadingReg] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registration, setRegistration] = useState<EducationalSupportRegistration | null>(null);
  const [form, setForm] = useState({
    functioningNotes: "",
    appliedPersonal: false,
    appliedCurricular: false,
    appliedAccess: false,
    appliedMethodology: false,
    appliedEvaluation: false,
    resultsNotes: "",
    observations: "",
  });

  useEffect(() => {
    if (!open) {
      setError(null);
      setAckSaving(false);
      setRegSaving(false);
      setRegistration(null);
      return;
    }

    if (!needsPeriodRegistration && !needsReview) {
      void loadRegistration();
      return;
    }

    if (!needsReview && needsPeriodRegistration) {
      void loadRegistration();
    }
  }, [open, needsReview, needsPeriodRegistration, studentId, classId, subjectId, conduct]);

  async function loadRegistration() {
    setLoadingReg(true);
    const res = await fetchEducationalSupportRegistration({
      studentId,
      classId,
      subjectId: conduct ? null : subjectId ?? null,
    });
    setLoadingReg(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    if (res.registration) {
      setRegistration(res.registration);
      setForm({
        functioningNotes: res.registration.functioningNotes ?? "",
        appliedPersonal: res.registration.appliedPersonal,
        appliedCurricular: res.registration.appliedCurricular,
        appliedAccess: res.registration.appliedAccess,
        appliedMethodology: res.registration.appliedMethodology,
        appliedEvaluation: res.registration.appliedEvaluation,
        resultsNotes: res.registration.resultsNotes,
        observations: res.registration.observations ?? "",
      });
    }
  }

  async function handleAcknowledge() {
    setAckSaving(true);
    setError(null);
    const res = await acknowledgeStudentEducationalSupports({ studentId, classId });
    setAckSaving(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    onComplete?.({ needsReview: false });
    if (needsPeriodRegistration) {
      void loadRegistration();
    } else {
      onClose();
    }
  }

  async function handleSaveRegistration() {
    if (form.resultsNotes.trim().length < 3) {
      setError(copy.registrationResultsRequired);
      return;
    }
    setRegSaving(true);
    setError(null);
    const payload: EducationalSupportRegistrationInput = {
      studentId,
      classId,
      subjectId: conduct ? null : subjectId ?? null,
      functioningNotes: form.functioningNotes.trim() || null,
      appliedPersonal: form.appliedPersonal,
      appliedCurricular: form.appliedCurricular,
      appliedAccess: form.appliedAccess,
      appliedMethodology: form.appliedMethodology,
      appliedEvaluation: form.appliedEvaluation,
      resultsNotes: form.resultsNotes.trim(),
      observations: form.observations.trim() || null,
    };
    const res = await saveEducationalSupportRegistration(payload);
    setRegSaving(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    onComplete?.({ needsPeriodRegistration: false });
    onClose();
  }

  const showRegistrationForm = !needsReview && (needsPeriodRegistration || registration !== null);
  const readOnlyRegistration = registration !== null && !needsPeriodRegistration && !needsReview;
  const contextLabel = conduct
    ? copy.registrationContextConduct
    : subjectName
      ? copy.registrationContextSubject.replace("{subject}", subjectName)
      : copy.registrationContextSubjectGeneric;

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
            className="flex max-h-[min(92vh,720px)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl"
            role="dialog"
            aria-labelledby="support-workflow-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-wide text-brand-600 dark:text-brand-300">
                  {copy.badgeLabel}
                </p>
                <h2 id="support-workflow-title" className="mt-1 text-lg font-bold text-foreground">
                  {studentName}
                </h2>
                <p className="mt-1 text-sm font-medium text-foreground/55">
                  {needsReview ? copy.reviewHint : copy.registrationHint}
                </p>
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
              <section>
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-foreground/45">
                  {copy.institutionalTitle}
                </h3>
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
                        <p className="mt-2 text-xs font-medium text-foreground/45">
                          {formatSubjectLine(item, copy)}
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
              </section>

              {showRegistrationForm ? (
                <section className="mt-6 border-t border-border pt-5">
                  <div className="mb-3 flex items-center gap-2">
                    <ClipboardCheck className="h-4 w-4 text-brand-600 dark:text-brand-300" strokeWidth={2.25} />
                    <h3 className="text-xs font-bold uppercase tracking-wide text-foreground/45">
                      {copy.registrationTitle}
                    </h3>
                  </div>
                  <p className="mb-4 text-sm font-medium text-foreground/55">
                    {contextLabel}
                    {registration?.periodLabel ? (
                      <span className="mt-1 block text-xs text-foreground/45">
                        {copy.registrationPeriod.replace("{period}", registration.periodLabel)}
                      </span>
                    ) : null}
                  </p>

                  {loadingReg ? (
                    <p className="text-sm font-medium text-foreground/45">{copy.registrationLoading}</p>
                  ) : (
                    <div className="flex flex-col gap-4">
                      <label className="flex flex-col gap-2">
                        <span className="text-sm font-semibold text-foreground/90">
                          {copy.registrationFunctioning}
                        </span>
                        <textarea
                          rows={3}
                          readOnly={readOnlyRegistration}
                          value={form.functioningNotes}
                          onChange={(event) =>
                            setForm((prev) => ({ ...prev, functioningNotes: event.target.value }))
                          }
                          className={textareaClass(readOnlyRegistration)}
                          placeholder={copy.registrationFunctioningPlaceholder}
                        />
                      </label>

                      <fieldset className="flex flex-col gap-2">
                        <legend className="text-sm font-semibold text-foreground/90">
                          {copy.registrationAppliedLabel}
                        </legend>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {APPLIED_FIELDS.map((field) => (
                            <label
                              key={field}
                              className={cn(
                                "flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm",
                                readOnlyRegistration ? "opacity-80" : "cursor-pointer hover:bg-surface-muted/40",
                              )}
                            >
                              <input
                                type="checkbox"
                                disabled={readOnlyRegistration}
                                checked={form[field]}
                                onChange={(event) =>
                                  setForm((prev) => ({ ...prev, [field]: event.target.checked }))
                                }
                                className="h-4 w-4 rounded border-border text-brand-600"
                              />
                              <span>{copy.registrationApplied[field]}</span>
                            </label>
                          ))}
                        </div>
                      </fieldset>

                      <label className="flex flex-col gap-2">
                        <span className="text-sm font-semibold text-foreground/90">
                          {copy.registrationResults}
                          {!readOnlyRegistration ? " *" : ""}
                        </span>
                        <textarea
                          rows={3}
                          required
                          readOnly={readOnlyRegistration}
                          value={form.resultsNotes}
                          onChange={(event) =>
                            setForm((prev) => ({ ...prev, resultsNotes: event.target.value }))
                          }
                          className={textareaClass(readOnlyRegistration)}
                          placeholder={copy.registrationResultsPlaceholder}
                        />
                      </label>

                      <label className="flex flex-col gap-2">
                        <span className="text-sm font-semibold text-foreground/90">
                          {copy.registrationObservations}
                        </span>
                        <textarea
                          rows={2}
                          readOnly={readOnlyRegistration}
                          value={form.observations}
                          onChange={(event) =>
                            setForm((prev) => ({ ...prev, observations: event.target.value }))
                          }
                          className={textareaClass(readOnlyRegistration)}
                          placeholder={copy.registrationObservationsPlaceholder}
                        />
                      </label>
                    </div>
                  )}
                </section>
              ) : null}
            </div>

            <div className="border-t border-border px-5 py-4">
              {error ? <p className="mb-3 text-xs font-semibold text-error">{error}</p> : null}
              {needsReview ? (
                <button
                  type="button"
                  disabled={ackSaving || supports.length === 0}
                  onClick={() => void handleAcknowledge()}
                  className={primaryButtonClass}
                >
                  {ackSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <HandHeart className="h-4 w-4" />
                  )}
                  {copy.acknowledge}
                </button>
              ) : showRegistrationForm && !readOnlyRegistration ? (
                <button
                  type="button"
                  disabled={regSaving || loadingReg}
                  onClick={() => void handleSaveRegistration()}
                  className={primaryButtonClass}
                >
                  {regSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ClipboardCheck className="h-4 w-4" />
                  )}
                  {copy.registrationSubmit}
                </button>
              ) : null}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}

const primaryButtonClass =
  "inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-brand-600 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-50";

function textareaClass(readOnly: boolean): string {
  return cn(
    "rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-foreground shadow-sm outline-none transition-colors placeholder:text-foreground/35 focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20",
    readOnly && "bg-surface-muted/30 text-foreground/75",
  );
}

function formatSubjectLine(
  item: EducationalSupport,
  copy: {
    subjectScopeAll: string;
    subjectScopeOne: string;
    subjectScopeMany: string;
  },
): string {
  if (item.subjectScope === "all") return copy.subjectScopeAll;
  if (item.subjectLabels.length === 1) {
    return copy.subjectScopeOne.replace("{subject}", item.subjectLabels[0]!);
  }
  if (item.subjectLabels.length > 1) {
    return copy.subjectScopeMany.replace("{subjects}", item.subjectLabels.join(", "));
  }
  return copy.subjectScopeAll;
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
