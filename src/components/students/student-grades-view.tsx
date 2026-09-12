"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  BookOpen,
  CalendarX,
  ChevronDown,
  ClipboardList,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocale, useT } from "@/lib/i18n/client";
import {
  fullName,
  finalScoreStatus,
} from "@/lib/dashboard/student-summary";
import {
  TONE_CARD,
  TONE_ICON,
  type Tone,
} from "@/lib/dashboard/tones";
import { ATTENDANCE_CODE, type AttendanceCounts } from "@/lib/attendance/model";
import type {
  StudentGradeItem,
  StudentGroupReport,
  StudentReport,
  StudentSubjectReport,
} from "@/lib/dashboard/student-report";
import type { AssignmentKind } from "@/lib/dashboard/exams";

/** Cycles subject cards through the shared palette so a transcript stays
 * scannable without each subject inventing its own colour. */
const TONE_CYCLE: Tone[] = ["blue", "purple", "green", "yellow", "rose"];

const ABSENCE_ORDER = [
  "absence_unjustified",
  "absence_justified",
  "late_unjustified",
  "late_justified",
] as const;

const KIND_STYLES: Record<AssignmentKind, string> = {
  classwork: "bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300",
  homework: "bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300",
  exam: "bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300",
  quiz: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  project: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
};

const BADGE_TONES: Record<string, string> = {
  excellent: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  passed: "bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300",
  "at-risk": "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  none: "bg-surface-muted text-foreground/50",
};

function scoreTone(score: number | null): string {
  if (score == null) return "text-foreground/40";
  if (score >= 70) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 50) return "text-amber-600 dark:text-amber-400";
  return "text-rose-600 dark:text-rose-400";
}

function scoreBar(score: number | null): string {
  if (score == null) return "bg-foreground/15";
  if (score >= 70) return "bg-emerald-500";
  if (score >= 50) return "bg-amber-500";
  return "bg-rose-500";
}

function initials(report: StudentReport): string {
  return (
    `${report.firstName?.[0] ?? ""}${report.lastName?.[0] ?? ""}`.toUpperCase() || "?"
  );
}

function formatDay(value: string, locale: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return value;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "es-CR", {
    day: "2-digit",
    month: "short",
  }).format(date);
}

/** MEP level for a grade number (1-6 elementary, 7+ secondary). */
function levelWord(
  grade: string | null,
  levels: { elementary: string; secondary: string },
): string | null {
  if (!grade) return null;
  const n = Number(grade.replace(/[^\d]/g, ""));
  if (!Number.isFinite(n) || n <= 0) return null;
  return n <= 6 ? levels.elementary : levels.secondary;
}

export function StudentGradesView({ report }: { report: StudentReport }) {
  const t = useT();
  const locale = useLocale();
  const r = t.student.report;
  const [groupFilter, setGroupFilter] = useState("all");

  const groups = useMemo(
    () =>
      groupFilter === "all"
        ? report.groups
        : report.groups.filter((group) => group.classId === groupFilter),
    [report.groups, groupFilter],
  );

  const subjectCount = report.groups.reduce(
    (sum, group) => sum + group.subjects.length,
    0,
  );
  const absenceTotal = report.groups.reduce((sum, group) => {
    const c = group.attendance;
    return (
      sum +
      c.absence_unjustified +
      c.absence_justified +
      c.late_unjustified +
      c.late_justified
    );
  }, 0);
  const overallStatus = finalScoreStatus(report.overall, locale);

  return (
    <div className="flex flex-col gap-5">
      <section className="relative overflow-hidden rounded-3xl border border-border bg-surface p-5 sm:p-6">
        <div
          aria-hidden
          className="brand-gradient pointer-events-none absolute inset-x-0 -top-24 h-40 opacity-[0.08] blur-2xl"
        />
        <div className="relative flex flex-wrap items-center gap-5">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl brand-gradient text-xl font-bold text-white shadow-sm">
            {initials(report)}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="brand-page-title truncate text-2xl font-bold text-foreground sm:text-3xl">
              {fullName(report)}
            </h1>
            <p className="mt-0.5 truncate text-sm font-medium text-foreground/55">
              {report.groups
                .map((group) =>
                  [group.name, levelWord(group.grade ?? report.grade, r.levels)]
                    .filter(Boolean)
                    .join(" "),
                )
                .join("  ·  ")}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-[11px] font-bold uppercase tracking-wide text-foreground/45">
                {r.overall}
              </p>
              <span
                className={cn(
                  "mt-1 inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                  BADGE_TONES[overallStatus.tone],
                )}
              >
                {overallStatus.label}
              </span>
            </div>
            <GradeRing value={report.overall} />
          </div>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={TrendingUp}
          tone="blue"
          label={r.overall}
          value={report.overall == null ? "—" : `${report.overall}%`}
          hint={r.gradedOf(report.gradedCount, report.totalCount)}
        />
        <StatCard
          icon={ClipboardList}
          tone="purple"
          label={r.evaluations}
          value={`${report.gradedCount} / ${report.totalCount}`}
          hint={r.gradedOf(report.gradedCount, report.totalCount)}
        />
        <StatCard
          icon={BookOpen}
          tone="yellow"
          label={r.subjects}
          value={String(subjectCount)}
          hint={r.groups + `: ${report.groups.length}`}
        />
        <StatCard
          icon={CalendarX}
          tone="rose"
          label={r.attendance}
          value={String(absenceTotal)}
          hint={
            <AttendanceCodes counts={report.groups.reduce<AttendanceCounts>(
              (totals, group) => {
                for (const status of ABSENCE_ORDER) totals[status] += group.attendance[status];
                return totals;
              },
              {
                present: 0,
                late_justified: 0,
                late_unjustified: 0,
                absence_justified: 0,
                absence_unjustified: 0,
              },
            )} />
          }
        />
      </div>

      {report.groups.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border bg-surface px-6 py-14 text-center text-sm font-medium text-foreground/55">
          {r.noGrades}
        </p>
      ) : (
        <>
          {report.groups.length > 1 ? (
            <div className="no-scrollbar flex gap-2 overflow-x-auto">
              <FilterChip
                active={groupFilter === "all"}
                onClick={() => setGroupFilter("all")}
              >
                {r.groups}
              </FilterChip>
              {report.groups.map((group) => (
                <FilterChip
                  key={group.classId}
                  active={groupFilter === group.classId}
                  onClick={() => setGroupFilter(group.classId)}
                >
                  {group.name}
                </FilterChip>
              ))}
            </div>
          ) : null}

          {groups.map((group) => (
            <GroupSection key={group.classId} group={group} />
          ))}
        </>
      )}
    </div>
  );
}

function GroupSection({ group }: { group: StudentGroupReport }) {
  const t = useT();
  const r = t.student.report;

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-surface">
      <header className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-border px-4 py-3">
        <div className="flex items-baseline gap-2">
          <h2 className="text-base font-bold text-foreground">{group.name}</h2>
          <span className="text-xs font-medium text-foreground/45">
            {r.gradedOf(group.gradedCount, group.totalCount)}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-foreground/55">
          <span>
            {r.overall}:{" "}
            <b className={cn("tabular-nums", scoreTone(group.average))}>
              {group.average == null ? "—" : `${group.average}%`}
            </b>
          </span>
          <AttendanceCodes counts={group.attendance} />
        </div>
      </header>
      <ul className="divide-y divide-border">
        {group.subjects.map((subject, index) => (
          <SubjectRow
            key={subject.id ?? `legacy-${group.classId}`}
            subject={subject}
            tone={TONE_CYCLE[index % TONE_CYCLE.length]}
          />
        ))}
      </ul>
    </section>
  );
}

/** One compact subject line that expands into the full assignment breakdown, so
 * a many-subject transcript stays scannable instead of a wall of cards. */
function SubjectRow({
  subject,
  tone,
}: {
  subject: StudentSubjectReport;
  tone: Tone;
}) {
  const t = useT();
  const locale = useLocale();
  const r = t.student.report;
  const [open, setOpen] = useState(false);
  const status = finalScoreStatus(subject.average, locale);

  return (
    <li>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-muted/60"
      >
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
            TONE_CARD[tone],
          )}
        >
          <BookOpen className={cn("h-4 w-4", TONE_ICON[tone])} strokeWidth={2.2} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-bold text-foreground">
            {subject.name || r.noSubject}
          </span>
          <span className="block truncate text-[11px] font-medium text-foreground/45">
            {r.gradedOf(subject.gradedCount, subject.totalCount)}
          </span>
        </span>
        <span className="hidden h-1.5 w-24 shrink-0 overflow-hidden rounded-full bg-surface-muted md:block">
          <span
            className={cn("block h-full rounded-full", scoreBar(subject.average))}
            style={{ width: `${subject.average ?? 0}%` }}
          />
        </span>
        <span
          className={cn(
            "w-12 shrink-0 text-right text-base font-bold tabular-nums",
            scoreTone(subject.average),
          )}
        >
          {subject.average == null ? "—" : `${subject.average}%`}
        </span>
        <span
          className={cn(
            "hidden shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold sm:inline-block",
            BADGE_TONES[status.tone],
          )}
        >
          {status.label}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-foreground/35 transition-transform duration-200",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>
      {open ? (
        <ul className="divide-y divide-border border-t border-border bg-surface-muted/20">
          {subject.items.map((item) => (
            <GradeRow key={item.id} item={item} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

function GradeRow({ item }: { item: StudentGradeItem }) {
  const t = useT();
  const locale = useLocale();
  const w = t.gradebook.workspace;
  const r = t.student.report;

  return (
    <li className="flex items-center gap-3 px-4 py-2.5">
      <span
        className={cn(
          "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide",
          KIND_STYLES[item.kind],
        )}
        title={w.kinds[item.kind]}
      >
        {w.kindShort[item.kind]}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-foreground">
          {item.title}
        </span>
        <span className="block truncate text-[11px] text-foreground/45">
          {w.kinds[item.kind]}
          {item.dueDate ? ` · ${r.due} ${formatDay(item.dueDate, locale)}` : ""}
        </span>
      </span>
      <span className="hidden shrink-0 text-right text-xs tabular-nums text-foreground/50 sm:block">
        {item.mark == null ? "—" : `${item.mark}/${item.maxMarks}`}
      </span>
      <span className="hidden h-1.5 w-20 shrink-0 overflow-hidden rounded-full bg-surface-muted sm:block">
        <span
          className={cn("block h-full rounded-full transition-[width] duration-500", scoreBar(item.pct))}
          style={{ width: `${item.pct ?? 0}%` }}
        />
      </span>
      <span className={cn("w-11 shrink-0 text-right text-sm font-bold tabular-nums", scoreTone(item.pct))}>
        {item.pct == null ? "—" : `${item.pct}%`}
      </span>
    </li>
  );
}

function StatCard({
  icon: Icon,
  tone,
  label,
  value,
  hint,
}: {
  icon: LucideIcon;
  tone: Tone;
  label: string;
  value: string;
  hint: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4">
      <div
        className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
          TONE_CARD[tone],
        )}
      >
        <Icon className={cn("h-5 w-5", TONE_ICON[tone])} strokeWidth={2.2} />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-wide text-foreground/45">
          {label}
        </p>
        <p className="text-xl font-bold tabular-nums text-foreground">{value}</p>
        <p className="truncate text-[11px] font-medium text-foreground/45">{hint}</p>
      </div>
    </div>
  );
}

function AttendanceCodes({ counts }: { counts: AttendanceCounts }) {
  const t = useT();
  if (counts.present + counts.late_justified + counts.late_unjustified + counts.absence_justified + counts.absence_unjustified === 0) {
    return null;
  }
  return (
    <span className="inline-flex items-center gap-2 tabular-nums">
      {ABSENCE_ORDER.map((status) => {
        const count = counts[status];
        return (
          <span
            key={status}
            title={t.attendance.statuses[status]}
            className="inline-flex items-center gap-0.5"
          >
            <span className="font-bold text-foreground/55">{ATTENDANCE_CODE[status]}</span>
            <span
              className={cn(
                "rounded px-1 font-bold",
                count <= 0
                  ? "text-foreground/70"
                  : count >= 3
                    ? "bg-rose-500/15 text-rose-700 dark:text-rose-300"
                    : "bg-amber-500/15 text-amber-700 dark:text-amber-300",
              )}
            >
              {count}
            </span>
          </span>
        );
      })}
    </span>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors",
        active
          ? "brand-gradient text-white"
          : "border border-border text-foreground/60 hover:bg-surface-muted hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function GradeRing({ value }: { value: number | null }) {
  const size = 92;
  const stroke = 9;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.max(0, Math.min(100, value ?? 0));
  const dash = (pct / 100) * circumference;
  const color = value == null ? "#cbd5e1" : pct >= 70 ? "#10b981" : pct >= 50 ? "#f59e0b" : "#f43f5e";

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          className="stroke-surface-muted"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
          className="transition-[stroke-dasharray] duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xl font-bold tabular-nums text-foreground">
          {value == null ? "—" : `${value}%`}
        </span>
      </div>
    </div>
  );
}
