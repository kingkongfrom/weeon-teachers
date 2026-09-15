"use client";

import { useMemo, useState, type ReactNode } from "react";
import { BarChart3, CalendarDays, Clock, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocale, useT } from "@/lib/i18n/client";
import { ReportExpandable } from "@/components/reports/report-expandable";
import {
  ATTENDANCE_CODE,
  ATTENDANCE_KIND,
  type AttendanceStatus,
} from "@/lib/attendance/model";
import { signedPoints } from "@/lib/conduct/model";
import { TONE_PILL } from "@/lib/dashboard/tones";
import {
  buildAssignmentBreakdown,
  buildConductCategoryBreakdown,
  classGradeStats,
  isAbsenceAttendanceStatus,
  isLateAttendanceStatus,
} from "@/lib/reports/breakdowns";
import {
  collectReportStudentIds,
  computeReportAverage,
  formatGradeCell,
  isReportPassing,
} from "@/lib/reports/grades";
import type { ReportDraft } from "@/lib/reports/model";

const ATTENDANCE_COLUMNS: AttendanceStatus[] = [
  "present",
  "late_justified",
  "late_unjustified",
  "absence_justified",
  "absence_unjustified",
];

type AttendanceFilter = "all" | "late" | "absence";

function formatIsoDate(iso: string, locale: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function attendanceTone(status: AttendanceStatus): string {
  if (status === "late_justified") return TONE_PILL.yellow;
  if (status === "late_unjustified") return TONE_PILL.rose;
  if (status === "absence_justified") return TONE_PILL.blue;
  return TONE_PILL.rose;
}

export function ReportPreviewPanels({ draft }: { draft: ReportDraft }) {
  return (
    <div className="flex flex-col gap-4">
      <ReportGradesPanel draft={draft} />
      <ReportConductPanel draft={draft} />
      <ReportAttendancePanel draft={draft} />
    </div>
  );
}

function ReportGradesPanel({ draft }: { draft: ReportDraft }) {
  const t = useT();
  const c = t.composer;
  const locale = useLocale();
  const assignmentIds = Object.keys(draft.grades);
  const studentIds = collectReportStudentIds(
    {
      grades: draft.grades,
      studentNames: draft.studentNames,
      assignmentTitles: draft.assignmentTitles,
    },
    draft.studentIds,
  );
  const stats = useMemo(
    () => classGradeStats(draft.grades, studentIds),
    [draft.grades, studentIds],
  );
  const breakdown = useMemo(
    () => buildAssignmentBreakdown(draft.grades, draft.assignmentsMeta, studentIds.length),
    [draft.grades, draft.assignmentsMeta, studentIds.length],
  );

  return (
    <ReportSectionCard
      icon={<BarChart3 className="h-4 w-4" strokeWidth={2.2} />}
      title={c.gradesTitle}
      chips={[
        stats.average !== null ? `${Math.round(stats.average)}% ${c.classAvg}` : null,
        stats.graded > 0 ? c.passRate(stats.passed, stats.graded) : null,
      ].filter(Boolean) as string[]}
    >
      {assignmentIds.length === 0 || studentIds.length === 0 ? (
        <p className="px-5 py-6 text-sm font-medium text-foreground/50">{c.noGrades}</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-fit min-w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-foreground/50">
                  <th className="px-4 py-2.5 font-medium">{c.student}</th>
                  {assignmentIds.map((assignmentId) => (
                    <th key={assignmentId} className="px-4 py-2.5 text-right font-medium">
                      {draft.assignmentTitles[assignmentId] ?? c.exam}
                    </th>
                  ))}
                  <th className="px-4 py-2.5 text-right font-medium">{c.average}</th>
                  <th className="px-4 py-2.5 font-medium">{c.status}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {studentIds.map((studentId, index) => {
                  const pct = computeReportAverage(draft.grades, studentId);
                  const passed = isReportPassing(pct);
                  return (
                    <tr
                      key={studentId}
                      className={index % 2 === 1 ? "bg-surface-muted/30" : undefined}
                    >
                      <td className="px-4 py-2 font-medium text-foreground">
                        {draft.studentNames[studentId] ?? studentId.slice(0, 6)}
                      </td>
                      {assignmentIds.map((assignmentId) => (
                        <td
                          key={assignmentId}
                          className="px-4 py-2 text-right tabular-nums text-foreground"
                        >
                          {formatGradeCell(draft.grades[assignmentId]?.[studentId])}
                        </td>
                      ))}
                      <td className="px-4 py-2 text-right tabular-nums">
                        {pct === null ? (
                          <span className="text-foreground/40">—</span>
                        ) : (
                          <span className="font-semibold text-foreground">{Math.round(pct)}%</span>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        {passed === null ? (
                          <span className="text-xs font-medium text-foreground/40">—</span>
                        ) : (
                          <StatusPill
                            passed={passed}
                            passedLabel={c.passed}
                            failedLabel={c.failed}
                          />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {breakdown.length > 0 ? (
            <ReportExpandable
              title={c.gradesBreakdownTitle}
              subtitle={c.gradesBreakdownHint}
              badge={c.itemCount(breakdown.length)}
            >
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {breakdown.map((row) => {
                  const kindLabel =
                    t.gradebook.workspace.kinds[row.meta.kind] ?? row.meta.kind;
                  const pct = row.avgPct === null ? null : Math.round(row.avgPct);
                  const passing = pct !== null && pct >= 70;
                  return (
                    <div
                      key={row.assignmentId}
                      className="rounded-xl border border-border bg-surface px-4 py-3 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold leading-snug text-foreground">
                          {row.meta.title}
                        </p>
                        <span className="shrink-0 rounded-md bg-brand-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-700 dark:bg-brand-950/40 dark:text-brand-300">
                          {kindLabel}
                        </span>
                      </div>
                      <div className="mt-3 flex items-end justify-between gap-3">
                        <div>
                          <p
                            className={cn(
                              "text-2xl font-bold tabular-nums",
                              pct === null
                                ? "text-foreground/35"
                                : passing
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : "text-rose-600 dark:text-rose-400",
                            )}
                          >
                            {pct === null ? "—" : `${pct}%`}
                          </p>
                          <p className="mt-0.5 text-[11px] font-medium text-foreground/45">
                            {c.assignmentAvg}
                          </p>
                        </div>
                        <p className="text-right text-xs font-medium text-foreground/50">
                          {c.gradedOf(row.gradedCount, row.totalStudents)}
                        </p>
                      </div>
                      {pct !== null ? (
                        <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-surface-muted">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all",
                              passing ? "bg-emerald-500" : "bg-rose-500",
                            )}
                            style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                          />
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </ReportExpandable>
          ) : null}
        </>
      )}
    </ReportSectionCard>
  );
}

function ReportConductPanel({ draft }: { draft: ReportDraft }) {
  const t = useT();
  const c = t.composer;
  const locale = useLocale();
  const rows = draft.studentIds.filter((id) => draft.conduct[id] != null);
  const categoryBreakdown = useMemo(
    () => buildConductCategoryBreakdown(draft.conductLog),
    [draft.conductLog],
  );

  return (
    <ReportSectionCard
      icon={<Shield className="h-4 w-4" strokeWidth={2.2} />}
      title={c.conductTitle}
      chips={
        draft.conductLog.length > 0
          ? [c.itemCount(draft.conductLog.length)]
          : undefined
      }
    >
      {rows.length === 0 ? (
        <p className="px-5 py-6 text-sm font-medium text-foreground/50">{c.noConduct}</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-fit min-w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-foreground/50">
                  <th className="px-4 py-2.5 font-medium">{c.student}</th>
                  <th className="px-4 py-2.5 text-right font-medium">{c.merits}</th>
                  <th className="px-4 py-2.5 text-right font-medium">{c.demerits}</th>
                  <th className="px-4 py-2.5 text-right font-medium">{c.netPoints}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {rows.map((studentId, index) => {
                  const row = draft.conduct[studentId]!;
                  return (
                    <tr
                      key={studentId}
                      className={index % 2 === 1 ? "bg-surface-muted/30" : undefined}
                    >
                      <td className="px-4 py-2 font-medium text-foreground">
                        {draft.studentNames[studentId] ?? studentId.slice(0, 6)}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums">{row.meritCount}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{row.demeritCount}</td>
                      <td
                        className={cn(
                          "px-4 py-2 text-right tabular-nums font-semibold",
                          row.netPoints >= 0 ? "text-emerald-600" : "text-rose-600",
                        )}
                      >
                        {row.netPoints > 0 ? `+${row.netPoints}` : row.netPoints}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {categoryBreakdown.length > 0 ? (
            <ReportExpandable
              title={c.conductCategoryTitle}
              subtitle={c.conductCategoryHint}
              badge={c.categoryCount(categoryBreakdown.length)}
            >
              <div className="flex flex-wrap gap-2">
                {categoryBreakdown.map((row) => (
                  <div
                    key={row.category}
                    className="rounded-xl border border-border bg-surface px-3 py-2"
                  >
                    <p className="text-xs font-semibold text-foreground/70">
                      {t.conduct.categories[row.category]}
                    </p>
                    <div className="mt-1 flex items-center gap-3 text-sm tabular-nums">
                      {row.meritCount > 0 ? (
                        <span className="font-semibold text-emerald-600">+{row.meritCount}</span>
                      ) : null}
                      {row.demeritCount > 0 ? (
                        <span className="font-semibold text-rose-600">−{row.demeritCount}</span>
                      ) : null}
                      {row.meritCount === 0 && row.demeritCount === 0 ? (
                        <span className="text-foreground/40">—</span>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </ReportExpandable>
          ) : null}

          {draft.conductLog.length > 0 ? (
            <ReportExpandable
              title={c.conductLogTitle}
              subtitle={c.conductLogHint}
              badge={c.itemCount(draft.conductLog.length)}
            >
              <ul className="flex max-h-[28rem] flex-col gap-2 overflow-y-auto pr-1">
                {draft.conductLog.map((entry, index) => {
                  const signed = signedPoints(entry.kind, entry.points);
                  const isMerit = entry.kind === "merit";
                  return (
                    <li
                      key={`${entry.studentId}-${entry.occurredOn}-${index}`}
                      className="rounded-xl border border-border bg-surface px-4 py-3"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={cn(
                            "rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide",
                            isMerit ? TONE_PILL.green : TONE_PILL.rose,
                          )}
                        >
                          {isMerit ? c.meritSingular : c.demeritSingular}
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-foreground/45">
                          <CalendarDays className="h-3.5 w-3.5" aria-hidden />
                          {formatIsoDate(entry.occurredOn, locale)}
                        </span>
                        <span className="text-xs font-semibold text-foreground/55">
                          {t.conduct.categories[entry.category]}
                        </span>
                        <span
                          className={cn(
                            "ml-auto text-sm font-bold tabular-nums",
                            signed >= 0 ? "text-emerald-600" : "text-rose-600",
                          )}
                        >
                          {signed > 0 ? `+${signed}` : signed}
                        </span>
                      </div>
                      <p className="mt-1.5 text-sm font-semibold text-foreground">
                        {draft.studentNames[entry.studentId] ?? entry.studentId.slice(0, 6)}
                      </p>
                      {entry.description ? (
                        <p className="mt-1 text-sm leading-relaxed text-foreground/65">
                          {entry.description}
                        </p>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </ReportExpandable>
          ) : null}
        </>
      )}
    </ReportSectionCard>
  );
}

function ReportAttendancePanel({ draft }: { draft: ReportDraft }) {
  const t = useT();
  const c = t.composer;
  const locale = useLocale();
  const [filter, setFilter] = useState<AttendanceFilter>("all");

  const summaryRows = draft.studentIds.filter((id) => {
    const counts = draft.attendance[id];
    if (!counts) return false;
    return ATTENDANCE_COLUMNS.some((status) => counts[status] > 0);
  });

  const filteredLog = useMemo(() => {
    return draft.attendanceLog.filter((row) => {
      if (filter === "late") return isLateAttendanceStatus(row.status);
      if (filter === "absence") return isAbsenceAttendanceStatus(row.status);
      return true;
    });
  }, [draft.attendanceLog, filter]);

  const lateCount = draft.attendanceLog.filter((r) => isLateAttendanceStatus(r.status)).length;
  const absenceCount = draft.attendanceLog.filter((r) =>
    isAbsenceAttendanceStatus(r.status),
  ).length;

  return (
    <ReportSectionCard
      icon={<Clock className="h-4 w-4" strokeWidth={2.2} />}
      title={c.attendanceTitle}
      chips={
        draft.attendanceLog.length > 0
          ? [
              lateCount > 0 ? c.lateCount(lateCount) : null,
              absenceCount > 0 ? c.absenceCount(absenceCount) : null,
            ].filter(Boolean) as string[]
          : undefined
      }
    >
      {summaryRows.length === 0 ? (
        <p className="px-5 py-6 text-sm font-medium text-foreground/50">{c.noAttendance}</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-fit min-w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-foreground/50">
                  <th className="px-4 py-2.5 font-medium">{c.student}</th>
                  {ATTENDANCE_COLUMNS.map((status) => (
                    <th key={status} className="px-4 py-2.5 text-right font-medium">
                      {ATTENDANCE_CODE[status]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {summaryRows.map((studentId, index) => {
                  const counts = draft.attendance[studentId]!;
                  return (
                    <tr
                      key={studentId}
                      className={index % 2 === 1 ? "bg-surface-muted/30" : undefined}
                    >
                      <td className="px-4 py-2 font-medium text-foreground">
                        {draft.studentNames[studentId] ?? studentId.slice(0, 6)}
                      </td>
                      {ATTENDANCE_COLUMNS.map((status) => (
                        <td key={status} className="px-4 py-2 text-right tabular-nums">
                          {counts[status] > 0 ? counts[status] : "—"}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {draft.attendanceLog.length > 0 ? (
            <ReportExpandable
              title={c.attendanceLogTitle}
              subtitle={c.attendanceLogHint}
              badge={c.itemCount(filteredLog.length)}
            >
              <div className="mb-3 flex flex-wrap gap-1.5">
                {(
                  [
                    ["all", c.filterAll],
                    ["late", c.filterLate],
                    ["absence", c.filterAbsence],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setFilter(value)}
                    className={cn(
                      "rounded-full px-3 py-1 text-xs font-semibold transition-colors",
                      filter === value
                        ? "bg-brand-600 text-white"
                        : "bg-surface border border-border text-foreground/60 hover:bg-surface-muted",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {filteredLog.length === 0 ? (
                <p className="py-4 text-center text-sm font-medium text-foreground/45">
                  {c.noAttendanceFiltered}
                </p>
              ) : (
                <ul className="flex max-h-[28rem] flex-col gap-2 overflow-y-auto pr-1">
                  {filteredLog.map((entry, index) => {
                    const kind = ATTENDANCE_KIND[entry.status];
                    const statusLabel = t.attendance.statuses[entry.status];
                    return (
                      <li
                        key={`${entry.studentId}-${entry.date}-${index}`}
                        className="rounded-xl border border-border bg-surface px-4 py-3"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={cn(
                              "rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide",
                              attendanceTone(entry.status),
                            )}
                          >
                            {ATTENDANCE_CODE[entry.status]}
                          </span>
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-foreground/45">
                            <CalendarDays className="h-3.5 w-3.5" aria-hidden />
                            {formatIsoDate(entry.date, locale)}
                          </span>
                          <span className="text-xs font-medium text-foreground/55">{statusLabel}</span>
                          <span
                            className={cn(
                              "rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                              kind === "late" ? "bg-amber-50 text-amber-800" : "bg-rose-50 text-rose-800",
                            )}
                          >
                            {kind === "late" ? c.lateKind : c.absenceKind}
                          </span>
                        </div>
                        <p className="mt-1.5 text-sm font-semibold text-foreground">
                          {draft.studentNames[entry.studentId] ?? entry.studentId.slice(0, 6)}
                        </p>
                        {entry.comment ? (
                          <p className="mt-1 text-sm leading-relaxed text-foreground/65">
                            {entry.comment}
                          </p>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              )}
            </ReportExpandable>
          ) : null}
        </>
      )}
    </ReportSectionCard>
  );
}

function ReportSectionCard({
  icon,
  title,
  chips,
  children,
}: {
  icon: ReactNode;
  title: string;
  chips?: string[];
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
      <div className="flex flex-wrap items-center gap-3 border-b border-border bg-background px-5 py-3.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300">
          {icon}
        </span>
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {chips?.map((chip) => (
          <span
            key={chip}
            className="rounded-full bg-surface-muted px-2.5 py-0.5 text-[11px] font-semibold text-foreground/55"
          >
            {chip}
          </span>
        ))}
      </div>
      {children}
    </section>
  );
}

function StatusPill({
  passed,
  passedLabel,
  failedLabel,
}: {
  passed: boolean;
  passedLabel: string;
  failedLabel: string;
}) {
  return (
    <span
      className={cn(
        "inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
        passed
          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
          : "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
      )}
    >
      {passed ? passedLabel : failedLabel}
    </span>
  );
}

// Re-export section components for pages that import individually.
export function ReportGradesSection({ draft }: { draft: ReportDraft }) {
  return <ReportGradesPanel draft={draft} />;
}

export function ReportConductSection({ draft }: { draft: ReportDraft }) {
  return <ReportConductPanel draft={draft} />;
}

export function ReportAttendanceSection({ draft }: { draft: ReportDraft }) {
  return <ReportAttendancePanel draft={draft} />;
}
