"use client";

import { useEffect, useState } from "react";
import { MapPin, Wallet, X } from "lucide-react";
import { PdfThumb } from "@/components/excursions/pdf-thumb";
import { PdfFileButton, PdfReaderDialog, PdfViewport } from "@/components/ui/pdf-reader";
import { useT } from "@/lib/i18n/client";
import type { Messages } from "@/lib/i18n/messages";
import {
  type ExcursionDecision,
  type TeacherExcursion,
  type TeacherExcursionMaterial,
} from "@/lib/dashboard/excursions";
import { cn } from "@/lib/utils";

type Copy = Messages["agenda"]["excursiones"];

/** Cover previews. Opening one shows the same trip detail as the school ERP. */
export function ExcursionBoard({
  upcoming,
  past,
}: {
  upcoming: TeacherExcursion[];
  past: TeacherExcursion[];
}) {
  const copy = useT().agenda.excursiones;
  const [viewing, setViewing] = useState<TeacherExcursion | null>(null);

  useEffect(() => {
    if (!viewing) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setViewing(null);
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, [viewing]);

  return (
    <>
      {upcoming.length > 0 ? (
        <section className="flex flex-col gap-3">
          <SectionHeading title={copy.upcoming} count={upcoming.length} />
          <div className="flex flex-wrap gap-4">
            {upcoming.map((trip) => (
              <TripPreview key={trip.id} trip={trip} copy={copy} onOpen={() => setViewing(trip)} />
            ))}
          </div>
        </section>
      ) : null}

      {past.length > 0 ? (
        <section className="flex flex-col gap-3">
          <SectionHeading title={copy.past} count={past.length} />
          <div className="flex flex-wrap gap-4">
            {past.map((trip) => (
              <TripPreview key={trip.id} trip={trip} copy={copy} onOpen={() => setViewing(trip)} />
            ))}
          </div>
        </section>
      ) : null}

      {viewing ? <TripDetail trip={viewing} copy={copy} onClose={() => setViewing(null)} /> : null}
    </>
  );
}

function SectionHeading({ title, count }: { title: string; count: number }) {
  return (
    <div className="flex items-center gap-2">
      <h2 className="text-xs font-bold uppercase tracking-wider text-foreground/45">{title}</h2>
      <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-bold text-brand-700 dark:bg-brand-950/50 dark:text-brand-300">
        {count}
      </span>
    </div>
  );
}

function TripPreview({
  trip,
  copy,
  onOpen,
}: {
  trip: TeacherExcursion;
  copy: Copy;
  onOpen: () => void;
}) {
  const [coverFailed, setCoverFailed] = useState(false);
  const time = trip.allDay ? copy.allDay : timeRange(trip);
  const stamp = dayStamp(trip.date);
  const decided = trip.students.filter((student) => student.decision !== "pending").length;
  const hasCover = Boolean(trip.imageUrl) && !coverFailed;

  return (
    <article className="flex w-full max-w-[18rem] flex-col overflow-hidden rounded-2xl border border-emerald-200/70 bg-surface dark:border-emerald-900/50">
      <div className="relative">
        <button
          type="button"
          onClick={onOpen}
          className="relative flex aspect-square w-full flex-col justify-end overflow-hidden text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={trip.title}
        >
          {hasCover ? (
            // eslint-disable-next-line @next/next/no-img-element -- public bucket cover
            <img
              src={trip.imageUrl ?? undefined}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
              onError={() => setCoverFailed(true)}
            />
          ) : (
            <span className="brand-gradient absolute inset-0" />
          )}
          <span className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-black/10" />
          <span className="relative flex flex-col gap-2 px-3 pb-3 pt-8">
            <span className="flex flex-wrap items-center gap-1.5">
              <span className="rounded-full bg-emerald-600/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                {copy.published}
              </span>
              {trip.groupName ? (
                <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold text-white">
                  {trip.groupName}
                </span>
              ) : null}
            </span>
            <span className="line-clamp-2 text-base font-bold leading-snug text-white">{trip.title}</span>
            <span className="flex items-center gap-2">
              <DateStamp stamp={stamp} />
              <span className="truncate text-xs font-medium text-white/90">
                {longDate(trip.date)}
                {time ? ` · ${time}` : ""}
              </span>
            </span>
            {trip.location || trip.cost != null ? (
              <span
                className={cn(
                  "flex min-w-0 items-center gap-1.5 truncate text-xs font-medium text-white/90",
                  trip.materials.length > 0 && "pr-14",
                )}
              >
                {trip.location ? (
                  <>
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{trip.location}</span>
                  </>
                ) : null}
                {trip.cost != null ? (
                  <span className="inline-flex shrink-0 items-center gap-1">
                    <Wallet className="h-3.5 w-3.5" />
                    {copy.costValue(numberLabel(trip.cost))}
                  </span>
                ) : null}
              </span>
            ) : null}
            <span
              className={cn(
                "truncate text-[11px] font-semibold text-white/80",
                trip.materials.length > 0 && "pr-14",
              )}
            >
              {copy.decidedCount(decided, trip.students.length)}
            </span>
          </span>
        </button>
        <CoverPdfs materials={trip.materials} />
      </div>
    </article>
  );
}

function TripDetail({
  trip,
  copy,
  onClose,
}: {
  trip: TeacherExcursion;
  copy: Copy;
  onClose: () => void;
}) {
  const closeLabel = useT().common.close;
  const [coverFailed, setCoverFailed] = useState(false);
  const time = trip.allDay ? copy.allDay : timeRange(trip);
  const stamp = dayStamp(trip.date);
  const hasCover = Boolean(trip.imageUrl) && !coverFailed;
  const approved = trip.students.filter((student) => student.decision === "approved").length;
  const denied = trip.students.filter((student) => student.decision === "denied").length;
  const pending = trip.students.length - approved - denied;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="excursion-detail-title"
        className="flex max-h-[min(88vh,42rem)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-border bg-surface"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="relative h-44 shrink-0 overflow-hidden sm:h-52">
          {hasCover ? (
            // eslint-disable-next-line @next/next/no-img-element -- public bucket cover
            <img
              src={trip.imageUrl ?? undefined}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
              onError={() => setCoverFailed(true)}
            />
          ) : (
            <span className="brand-gradient absolute inset-0" />
          )}
          <span className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-black/20" />
          <button
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/45 text-white transition-colors hover:bg-black/65"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="absolute inset-x-0 bottom-0 flex flex-col gap-2 px-5 pb-4">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="rounded-full bg-emerald-600/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                {copy.published}
              </span>
              {trip.groupName ? (
                <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold text-white">
                  {trip.groupName}
                </span>
              ) : null}
            </div>
            <h2 id="excursion-detail-title" className="text-xl font-bold leading-snug text-white">
              {trip.title}
            </h2>
            <div className="flex items-center gap-2">
              <DateStamp stamp={stamp} />
              <span className="text-sm font-medium text-white/90">
                {longDate(trip.date)}
                {time ? ` · ${time}` : ""}
              </span>
            </div>
          </div>
        </header>

        <div className="grid min-h-0 flex-1 gap-5 overflow-y-auto px-5 py-4 sm:grid-cols-[minmax(0,15rem)_minmax(0,1fr)]">
          <div className="flex flex-col gap-3">
            <dl className="grid grid-cols-2 gap-x-3 gap-y-2.5 sm:grid-cols-1">
              <DetailFact label={copy.teacher} value={trip.teacherName} />
              {trip.location ? <DetailFact label={copy.location} value={trip.location} /> : null}
              {trip.meetingPoint ? <DetailFact label={copy.meetingPoint} value={trip.meetingPoint} /> : null}
              {trip.cost != null ? (
                <DetailFact label={copy.cost} value={copy.costValue(numberLabel(trip.cost))} />
              ) : null}
              {trip.consentDeadline ? (
                <DetailFact label={copy.deadline} value={longDate(trip.consentDeadline)} />
              ) : null}
            </dl>
            {trip.description ? (
              <p className="whitespace-pre-wrap text-sm font-medium leading-relaxed text-foreground/70">
                {trip.description}
              </p>
            ) : null}
            <DetailPdfs materials={trip.materials} />
          </div>

          <section className="flex min-h-0 flex-col">
            <h3 className="text-sm font-bold text-foreground">{copy.consentTitle}</h3>
            <p className="mt-0.5 text-xs font-medium text-foreground/55">
              {copy.consentSummary(approved, denied, pending)}
            </p>
            {trip.students.length === 0 ? (
              <p className="mt-3 text-sm font-medium text-foreground/55">{copy.consentEmpty}</p>
            ) : (
              <ul className="mt-2 divide-y divide-border/70">
                {trip.students.map((student) => (
                  <li key={student.id} className="flex items-center justify-between gap-3 py-2.5">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-foreground">{student.name}</span>
                      {student.guardians.length > 0 ? (
                        <span className="block truncate text-xs font-medium text-foreground/50">
                          {student.guardians
                            .map((guardian) => `${guardian.name} · ${decisionLabel(copy, guardian.decision)}`)
                            .join(" / ")}
                        </span>
                      ) : null}
                    </span>
                    <DecisionPill decision={student.decision} copy={copy} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function DateStamp({ stamp }: { stamp: { day: string; month: string } }) {
  return (
    <span className="flex h-12 w-11 shrink-0 flex-col items-center justify-center rounded-lg bg-orange-100 text-orange-700">
      <span className="text-lg font-extrabold leading-none">{stamp.day}</span>
      <span className="text-[10px] font-bold lowercase leading-none">{stamp.month}</span>
    </span>
  );
}

function DetailFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-semibold text-foreground/40">{label}</dt>
      <dd className="truncate text-sm font-semibold text-foreground">{value}</dd>
    </div>
  );
}

function CoverPdfs({ materials }: { materials: TeacherExcursionMaterial[] }) {
  if (materials.length === 0) return null;
  return (
    <ul className="absolute bottom-2 right-2 z-10 flex max-w-[70%] flex-row-reverse flex-wrap gap-1">
      {materials.map((material) => (
        <li key={material.id}>
          <PdfFileButton
            url={material.url}
            name={materialLabel(material.fileName)}
            mimeType="application/pdf"
            className="block h-11 w-11 cursor-pointer overflow-hidden rounded-md border-2 border-white bg-white p-0"
          >
            <PdfThumb url={material.url} />
          </PdfFileButton>
        </li>
      ))}
    </ul>
  );
}

function DetailPdfs({ materials }: { materials: TeacherExcursionMaterial[] }) {
  const [expanded, setExpanded] = useState<TeacherExcursionMaterial | null>(null);
  if (materials.length === 0) return null;
  return (
    <>
      <ul className="flex flex-col gap-3">
        {materials.map((material) => (
          <li
            key={material.id}
            className="flex h-[420px] flex-col overflow-hidden rounded-xl border border-border"
          >
            <PdfViewport
              url={material.url}
              showChrome={false}
              onExpand={() => setExpanded(material)}
            />
          </li>
        ))}
      </ul>
      <PdfReaderDialog
        open={expanded != null}
        url={expanded?.url ?? null}
        name={expanded ? materialLabel(expanded.fileName) : ""}
        onClose={() => setExpanded(null)}
      />
    </>
  );
}

function DecisionPill({ decision, copy }: { decision: ExcursionDecision; copy: Copy }) {
  const label = decisionLabel(copy, decision);
  const tone =
    decision === "approved"
      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
      : decision === "denied"
        ? "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
        : "bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300";
  return <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${tone}`}>{label}</span>;
}

function decisionLabel(copy: Copy, decision: ExcursionDecision): string {
  if (decision === "approved") return copy.approved;
  if (decision === "denied") return copy.denied;
  return copy.pending;
}

function materialLabel(fileName: string): string {
  const trimmed = fileName.trim();
  return trimmed.replace(/\.pdf$/i, "").trim() || trimmed;
}

function parseIso(iso: string): Date | null {
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function dayStamp(iso: string): { day: string; month: string } {
  const date = parseIso(iso);
  if (!date) return { day: "", month: "" };
  return {
    day: String(date.getDate()),
    month: date.toLocaleDateString("es-CR", { month: "short" }).replace(".", "").toLowerCase(),
  };
}

function longDate(iso: string): string {
  const date = parseIso(iso);
  if (!date) return iso;
  return date.toLocaleDateString("es-CR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function numberLabel(value: number): string {
  return value.toLocaleString("es-CR", { maximumFractionDigits: 0 });
}

function timeRange(trip: TeacherExcursion): string | null {
  if (!trip.startTime) return null;
  const start = trip.startTime.slice(0, 5);
  const end = trip.endTime ? trip.endTime.slice(0, 5) : null;
  return end ? `${start} – ${end}` : start;
}
