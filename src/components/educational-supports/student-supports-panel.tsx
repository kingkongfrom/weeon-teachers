"use client";

import { useEffect, useState } from "react";
import { Check, HandHeart, Loader2, Pencil, X } from "lucide-react";
import { useT } from "@/lib/i18n/client";
import { Dropdown } from "@/components/ui/dropdown";
import {
  periodOptionLabel,
  periodOptionRange,
  type EducationalSupport,
  type SchoolPeriodOption,
} from "@/lib/educational-supports/model";
import {
  extendStudentEducationalSupport,
  fetchSchoolPeriods,
} from "@/lib/teachers/educational-support-actions";

export function StudentEducationalSupportsPanel({
  supports,
  classId,
}: {
  supports: EducationalSupport[];
  /** When present, editing revalidates the group badges too. */
  classId?: string;
}) {
  const t = useT();
  const copy = t.educationalSupports;
  const [editingId, setEditingId] = useState<string | null>(null);

  if (supports.length === 0) return null;

  return (
    <section className="rounded-2xl border border-brand-200/70 bg-brand-50/40 px-5 py-4 dark:border-brand-900/50 dark:bg-brand-950/20">
      <div className="mb-3 flex items-center gap-2">
        <HandHeart className="h-4 w-4 text-brand-600 dark:text-brand-300" strokeWidth={2.25} />
        <h2 className="text-sm font-bold uppercase tracking-wide text-brand-800 dark:text-brand-200">
          {copy.sectionTitle}
        </h2>
      </div>
      <ul className="flex flex-col gap-3">
        {supports.map((item) =>
          editingId === item.id ? (
            <SupportEditForm
              key={item.id}
              support={item}
              classId={classId}
              onCancel={() => setEditingId(null)}
              onSaved={() => setEditingId(null)}
            />
          ) : (
            <li
              key={item.id}
              className="rounded-xl border border-border/70 bg-surface px-4 py-3"
            >
              <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-brand-700 dark:bg-brand-950/40 dark:text-brand-300">
                {copy.categories[item.category]}
              </span>
              <p className="mt-2 text-sm font-bold text-foreground">{item.title}</p>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-foreground/70">
                {item.description}
              </p>
              <p className="mt-2 text-xs font-medium text-foreground/45">
                {item.subjectScope === "all"
                  ? copy.subjectScopeAll
                  : item.subjectLabels.length === 1
                    ? copy.subjectScopeOne.replace("{subject}", item.subjectLabels[0]!)
                    : item.subjectLabels.length > 1
                      ? copy.subjectScopeMany.replace("{subjects}", item.subjectLabels.join(", "))
                      : copy.subjectScopeAll}
                {item.effectiveUntil ? ` · ${copy.vigenciaUntil} ${item.effectiveUntil}` : ""}
              </p>
              {item.observations ? (
                <div className="mt-2 rounded-lg border border-border/70 bg-surface-muted/50 px-3 py-2">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-foreground/45">
                    {copy.observations}
                  </p>
                  <p className="mt-0.5 whitespace-pre-wrap text-sm leading-relaxed text-foreground/70">
                    {item.observations}
                  </p>
                </div>
              ) : null}
              {/* One entry point for both acts (extend the vigencia and/or add
                  an observation): a separate "Agregar observación" link was
                  redundant. */}
              <button
                type="button"
                onClick={() => setEditingId(item.id)}
                className="mt-2 inline-flex h-8 items-center gap-1.5 rounded-full border border-border px-3 text-xs font-semibold text-foreground/65 transition-colors hover:bg-surface-muted hover:text-foreground"
              >
                <Pencil className="h-3.5 w-3.5" />
                {copy.editSupport}
              </button>
            </li>
          ),
        )}
      </ul>
    </section>
  );
}

/**
 * Only the parts a teacher owns are editable: the vigencia (next school period)
 * and the observations. Título and adecuación are the institution's record and
 * stay read-only here.
 */
function SupportEditForm({
  support,
  classId,
  onCancel,
  onSaved,
}: {
  support: EducationalSupport;
  classId?: string;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const t = useT();
  const copy = t.educationalSupports;
  const [observations, setObservations] = useState(support.observations ?? "");
  const [periods, setPeriods] = useState<SchoolPeriodOption[]>([]);
  const [periodEnd, setPeriodEnd] = useState<string>("");
  const [loadingPeriods, setLoadingPeriods] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void fetchSchoolPeriods().then((res) => {
      if (!active) return;
      if (res.ok) setPeriods(res.periods);
      setLoadingPeriods(false);
    });
    return () => {
      active = false;
    };
  }, []);

  // A support is extended forward only: only periods ending after the current
  // vigencia are offered (and the current one when there is no end yet).
  const currentEnd = support.effectiveUntil ?? "";
  const extendable = periods.filter(
    (period) => !currentEnd || period.endDate > currentEnd,
  );

  // Preselect the first extendable period once the list arrives.
  useEffect(() => {
    if (loadingPeriods || periodEnd || !extendable[0]) return;
    const timer = setTimeout(() => setPeriodEnd(extendable[0].endDate), 0);
    return () => clearTimeout(timer);
  }, [loadingPeriods, periodEnd, extendable]);

  async function save() {
    if (pending) return;
    const trimmed = observations.trim();
    const observationsChanged = trimmed !== (support.observations ?? "");
    const periodChanged = Boolean(periodEnd) && periodEnd !== support.effectiveUntil;

    if (!observationsChanged && !periodChanged) {
      onSaved();
      return;
    }

    setPending(true);
    setError(null);
    const res = await extendStudentEducationalSupport({
      id: support.id,
      studentId: support.studentId,
      classId,
      effectiveUntil: periodChanged ? periodEnd : (support.effectiveUntil ?? periodEnd),
      observations: trimmed || null,
    });
    setPending(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    onSaved();
  }

  const options = extendable.map((period) => ({
    value: period.endDate,
    label: periodOptionLabel(period),
  }));
  const selectedPeriod = extendable.find((period) => period.endDate === periodEnd) ?? null;

  return (
    <li className="rounded-xl border border-brand-300 bg-surface px-4 py-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-wide text-brand-700 dark:text-brand-300">
          {copy.editSupportTitle}
        </p>
        <button
          type="button"
          onClick={onCancel}
          aria-label={t.common.cancel}
          className="flex h-7 w-7 items-center justify-center rounded-full text-foreground/50 hover:bg-surface-muted hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Read-only institution record: title + accommodation. */}
      <div className="mt-3 rounded-lg border border-border/70 bg-surface-muted/40 px-3 py-2">
        <p className="text-[10px] font-bold uppercase tracking-wide text-foreground/45">
          {copy.supportTitleLabel}
        </p>
        <p className="text-sm font-semibold text-foreground">{support.title}</p>
        <p className="mt-2 text-[10px] font-bold uppercase tracking-wide text-foreground/45">
          {copy.adaptationLabel}
        </p>
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/70">
          {support.description}
        </p>
      </div>

      <div className="mt-3 flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-foreground/60">
            {copy.extendUntilLabel}
          </span>
          <div className="w-52 max-w-full">
            <Dropdown
              value={periodEnd}
              onChange={setPeriodEnd}
              options={options}
              ariaLabel={copy.extendUntilLabel}
              placeholder={
                loadingPeriods ? copy.loadingPeriods : copy.samePeriodHint
              }
              size="form"
              fitContent
              disabled={loadingPeriods || extendable.length === 0}
            />
          </div>
          <span className="text-[11px] font-medium tabular-nums text-foreground/45">
            {extendable.length === 0 && !loadingPeriods
              ? copy.samePeriodHint
              : selectedPeriod
                ? periodOptionRange(selectedPeriod)
                : copy.extendUntilHint}
          </span>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-foreground/60">{copy.observations}</span>
          <textarea
            value={observations}
            onChange={(event) => setObservations(event.target.value)}
            rows={3}
            maxLength={2000}
            placeholder={copy.observationsPlaceholder}
            className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm leading-relaxed text-foreground outline-none transition-colors focus:border-brand-400 focus:ring-2 focus:ring-brand-100 dark:focus:ring-brand-950"
          />
        </label>
      </div>

      {error ? (
        <p className="mt-2 rounded-lg border border-error/30 bg-error/10 px-3 py-2 text-sm font-medium text-error">
          {error}
        </p>
      ) : null}

      <p className="mt-2 text-[11px] font-medium text-foreground/45">{copy.editClearsAck}</p>

      <div className="mt-3 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex h-9 items-center rounded-xl border border-border px-3.5 text-sm font-semibold text-foreground/70 hover:bg-surface-muted"
        >
          {t.common.cancel}
        </button>
        <button
          type="button"
          onClick={() => void save()}
          disabled={pending}
          className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          {copy.saveSupport}
        </button>
      </div>
    </li>
  );
}
