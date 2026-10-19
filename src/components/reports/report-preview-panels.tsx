"use client";

import Link from "next/link";
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
  buildConductCategoryBreakdown,
  classGradeStats,
  isAbsenceAttendanceStatus,
  isLateAttendanceStatus,
} from "@/lib/reports/breakdowns";
import {
  collectReportStudentIds,
  formatGradeCell,
  isReportPassing,
} from "@/lib/reports/grades";
import {
  buildReportRubroGroups,
  buildReportRubroSummary,
  buildReportStudentRows,
  reportIsWeighted,
} from "@/lib/reports/rubros";
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

function attendanceDot(status: AttendanceStatus): string {
  if (status === "present") return "bg-emerald-500";
  if (status === "late_justified") return "bg-amber-500";
  if (status === "late_unjustified") return "bg-rose-500";
  if (status === "absence_justified") return "bg-sky-500";
  return "bg-rose-500";
}

function initials(name: string | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part.charAt(0).toUpperCase()).join("");
}

export type ReportPreviewVariant = "composer" | "archive";

export function ReportPreviewPanels({
  draft,
  variant = "composer",
}: {
  draft: ReportDraft;
  variant?: ReportPreviewVariant;
}) {
  return (
    <div className="flex flex-col gap-4">
      <ReportGradesPanel draft={draft} />
      {variant === "composer" ? (
        <>
          <ReportConductPanel draft={draft} presentation="collapsible" />
          <ReportAttendancePanel draft={draft} presentation="collapsible" />
        </>
      ) : (
        <ReportArchiveSnapshotPanel draft={draft} />
      )}
    </div>
  );
}

type PanelPresentation = "section" | "collapsible" | "embedded";

function ReportArchiveSnapshotPanel({ draft }: { draft: ReportDraft }) {
  const t = useT();
  const c = t.composer;
  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
      <ReportExpandable
        title={c.snapshotBundleTitle}
        subtitle={snapshotBundleSubtitle(draft, c)}
        defaultOpen={false}
      >
        <ReportConductPanel draft={draft} presentation="embedded" />
        <div className="my-5 border-t border-border/70" aria-hidden />
        <ReportAttendancePanel draft={draft} presentation="embedded" />
      </ReportExpandable>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/70 bg-surface-muted/15 px-5 py-3">
        <p className="text-xs font-medium text-foreground/50">{c.archiveLiveHint}</p>
        <Link
          href={`/grupos/${draft.classId}`}
          className="text-xs font-semibold text-brand-700 hover:underline dark:text-brand-300"
        >
          {c.archiveOpenGroup}
        </Link>
      </div>
    </section>
  );
}

function snapshotBundleSubtitle(
  draft: ReportDraft,
  c: ReturnType<typeof useT>["composer"],
): string {
  const conduct = conductTotals(draft);
  const late = draft.attendanceLog.filter((r) => isLateAttendanceStatus(r.status)).length;
  const absence = draft.attendanceLog.filter((r) => isAbsenceAttendanceStatus(r.status)).length;
  const parts: string[] = [];
  if (conduct.merits + conduct.demerits > 0 || draft.conductLog.length > 0) {
    parts.push(c.snapshotConductShort(conduct.merits, conduct.demerits));
  }
  if (late + absence > 0 || draft.attendanceLog.length > 0) {
    parts.push(c.snapshotAttendanceShort(late, absence));
  }
  return parts.length > 0 ? parts.join(" · ") : c.snapshotBundleEmpty;
}

function conductTotals(draft: ReportDraft): { merits: number; demerits: number } {
  let merits = 0;
  let demerits = 0;
  for (const row of Object.values(draft.conduct)) {
    merits += row.meritCount;
    demerits += row.demeritCount;
  }
  return { merits, demerits };
}

function conductSummaryLine(
  draft: ReportDraft,
  c: ReturnType<typeof useT>["composer"],
): string {
  const { merits, demerits } = conductTotals(draft);
  if (merits === 0 && demerits === 0 && draft.conductLog.length === 0) {
    return c.noConduct;
  }
  return c.snapshotConductShort(merits, demerits);
}

function attendanceSummaryLine(
  draft: ReportDraft,
  c: ReturnType<typeof useT>["composer"],
): string {
  const late = draft.attendanceLog.filter((r) => isLateAttendanceStatus(r.status)).length;
  const absence = draft.attendanceLog.filter((r) => isAbsenceAttendanceStatus(r.status)).length;
  if (late === 0 && absence === 0 && draft.attendanceLog.length === 0) {
    return c.noAttendance;
  }
  return c.snapshotAttendanceShort(late, absence);
}

function ReportGradesPanel({ draft }: { draft: ReportDraft }) {
  const t = useT();
  const c = t.composer;
  const w = t.gradebook.workspace.rubros;
  const assignmentIds = Object.keys(draft.grades);
  const studentIds = collectReportStudentIds(
    {
      grades: draft.grades,
      studentNames: draft.studentNames,
      assignmentTitles: draft.assignmentTitles,
    },
    draft.studentIds,
  );
  const assignmentKey = assignmentIds.join("|");
  const weighted = reportIsWeighted(draft.assignmentsMeta, draft.rubros);
  const groups = useMemo(
    () =>
      buildReportRubroGroups(
        assignmentKey.length > 0 ? assignmentKey.split("|") : [],
        draft.assignmentsMeta,
        draft.rubros,
      ),
    [assignmentKey, draft.assignmentsMeta, draft.rubros],
  );
  const rows = useMemo(
    () => buildReportStudentRows(groups, draft.grades, studentIds, draft.finals),
    [groups, draft.grades, studentIds, draft.finals],
  );
  const rubroSummary = useMemo(
    () => buildReportRubroSummary(groups, draft.grades, studentIds),
    [groups, draft.grades, studentIds],
  );
  const stats = useMemo(
    () => classGradeStats(draft.grades, studentIds, draft.finals),
    [draft.grades, studentIds, draft.finals],
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
                <tr className="border-b border-border text-xs uppercase tracking-wide text-foreground/50">
                  <th rowSpan={2} className="px-4 py-2 text-left font-medium">
                    {c.student}
                  </th>
                  {groups.map((group) => (
                    <th
                      key={group.id ?? "none"}
                      colSpan={weighted ? group.columns.length + 1 : group.columns.length}
                      className="border-l border-border px-3 py-2 text-center font-medium"
                    >
                      {group.name ? (
                        <span className="inline-flex items-center gap-1.5">
                          <span className="text-foreground/70">{group.name}</span>
                          {group.peso != null ? (
                            <span className="rounded bg-[#e6defb] px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-[#4c1d95] dark:bg-[#241b45] dark:text-[#c4b5fd]">
                              {group.peso}%
                            </span>
                          ) : null}
                        </span>
                      ) : (
                        <span className="text-foreground/45">{w.noRubro}</span>
                      )}
                    </th>
                  ))}
                  <th
                    rowSpan={2}
                    className="border-l-2 border-l-foreground/25 px-4 py-2 text-right align-middle font-medium"
                  >
                    {c.finalLabel}
                  </th>
                </tr>
                <tr className="border-b border-border text-xs uppercase tracking-wide text-foreground/45">
                  {groups.map((group) => (
                    <ReportColumnSubheads
                      key={`cols-${group.id ?? "none"}`}
                      group={group}
                      titles={draft.assignmentTitles}
                      fallback={c.exam}
                      showTotal={weighted}
                      totalLabel={w.subtotal}
                    />
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {rows.map((row, index) => {
                  const passed = isReportPassing(row.final);
                  return (
                    <tr
                      key={row.studentId}
                      className={index % 2 === 1 ? "bg-surface-muted/30" : undefined}
                    >
                      <td className="px-4 py-2 font-medium text-foreground">
                        {draft.studentNames[row.studentId] ??
                          row.studentId.slice(0, 6)}
                      </td>
                      {groups.map((group) => (
                        <ReportStudentGroupCells
                          key={`${row.studentId}-${group.id ?? "none"}`}
                          group={group}
                          row={row}
                          grades={draft.grades}
                          showTotal={weighted}
                        />
                      ))}
                      <td className="border-l-2 border-l-foreground/25 px-4 py-2 text-right tabular-nums">
                        {row.final === null ? (
                          <span className="text-foreground/40">—</span>
                        ) : (
                          <span className="inline-flex items-center justify-end gap-3">
                            <span className="w-10 text-right font-semibold text-foreground">
                              {row.final}%
                            </span>
                            <StatusPill
                              passed={passed === true}
                              passedLabel={c.passed}
                              failedLabel={c.failed}
                            />
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {rubroSummary.length > 0 ? (
            <ReportExpandable
              title={c.rubroBreakdownTitle}
              subtitle={c.rubroBreakdownHint}
              badge={c.categoryCount(rubroSummary.length)}
            >
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {rubroSummary.map((row) => {
                  const pct = row.average;
                  const passing = pct !== null && pct >= 70;
                  return (
                    <div
                      key={row.id ?? "none"}
                      className="rounded-xl border border-border bg-surface px-4 py-3 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold leading-snug text-foreground">
                          {row.name ?? w.noRubro}
                        </p>
                        {row.peso != null ? (
                          <span className="shrink-0 rounded bg-[#e6defb] px-2 py-0.5 text-[10px] font-bold tabular-nums text-[#4c1d95] dark:bg-[#241b45] dark:text-[#c4b5fd]">
                            {row.peso}%
                          </span>
                        ) : null}
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
                            {c.rubroAvg}
                          </p>
                        </div>
                        <p className="text-right text-xs font-medium text-foreground/50">
                          {c.rubroColumns(row.columnCount)}
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

function ReportColumnSubheads({
  group,
  titles,
  fallback,
  showTotal,
  totalLabel,
}: {
  group: ReturnType<typeof buildReportRubroGroups>[number];
  titles: Record<string, string>;
  fallback: string;
  showTotal: boolean;
  totalLabel: string;
}) {
  return (
    <>
      {group.columns.map((column, index) => (
        <th
          key={column.assignmentId}
          className={cn(
            "px-3 py-1.5 text-right font-medium",
            index === 0 && "border-l border-border",
          )}
        >
          {titles[column.assignmentId] ?? fallback}
        </th>
      ))}
      {showTotal ? (
        <th className="bg-surface-muted/40 px-3 py-1.5 text-right font-bold text-[#7c3aed] dark:text-[#b9a3f7]">
          {totalLabel}
        </th>
      ) : null}
    </>
  );
}

function ReportStudentGroupCells({
  group,
  row,
  grades,
  showTotal,
}: {
  group: ReturnType<typeof buildReportRubroGroups>[number];
  row: ReturnType<typeof buildReportStudentRows>[number];
  grades: ReportDraft["grades"];
  showTotal: boolean;
}) {
  const key = group.id ?? "none";
  const contribution = row.contributions[key];
  const percent = row.rubroPercents[key];
  return (
    <>
      {group.columns.map((column, index) => (
        <td
          key={column.assignmentId}
          className={cn(
            "px-3 py-2 text-right tabular-nums text-foreground",
            index === 0 && "border-l border-border",
          )}
        >
          {formatGradeCell(grades[column.assignmentId]?.[row.studentId])}
        </td>
      ))}
      {showTotal ? (
        <td
          title={
            percent == null || group.peso == null
              ? group.name ?? undefined
              : `${group.name}: ${Math.round(percent)}% x ${group.peso}% = ${
                  contribution?.toFixed(1) ?? "—"
                }%`
          }
          className="bg-surface-muted/30 px-3 py-2 text-right font-bold tabular-nums text-[#7c3aed] dark:text-[#b9a3f7]"
        >
          {contribution == null ? "—" : `${contribution.toFixed(1)}%`}
        </td>
      ) : null}
    </>
  );
}

function ReportConductPanel({
  draft,
  presentation = "section",
}: {
  draft: ReportDraft;
  presentation?: PanelPresentation;
}) {
  const t = useT();
  const c = t.composer;
  const locale = useLocale();
  const rows = draft.studentIds.filter((id) => draft.conduct[id] != null);
  const categoryBreakdown = useMemo(
    () => buildConductCategoryBreakdown(draft.conductLog),
    [draft.conductLog],
  );

  const body =
    rows.length === 0 ? (
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
    );

  if (presentation === "embedded") {
    return <div>{body}</div>;
  }

  if (presentation === "collapsible") {
    return (
      <section className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
        <ReportExpandable
          title={c.conductTitle}
          subtitle={conductSummaryLine(draft, c)}
          badge={
            draft.conductLog.length > 0 ? c.itemCount(draft.conductLog.length) : undefined
          }
          defaultOpen={false}
        >
          {body}
        </ReportExpandable>
      </section>
    );
  }

  return (
    <ReportSectionCard
      icon={<Shield className="h-4 w-4" strokeWidth={2.2} />}
      title={c.conductTitle}
      chips={
        draft.conductLog.length > 0 ? [c.itemCount(draft.conductLog.length)] : undefined
      }
    >
      {body}
    </ReportSectionCard>
  );
}

function ReportAttendancePanel({
  draft,
  presentation = "section",
}: {
  draft: ReportDraft;
  presentation?: PanelPresentation;
}) {
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
  const columnTotals = ATTENDANCE_COLUMNS.map((status) => ({
    status,
    total: summaryRows.reduce(
      (sum, studentId) => sum + (draft.attendance[studentId]?.[status] ?? 0),
      0,
    ),
  }));

  const body =
    summaryRows.length === 0 ? (
      <p className="px-5 py-6 text-sm font-medium text-foreground/50">{c.noAttendance}</p>
    ) : (
      <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-foreground/50">
                    {c.student}
                  </th>
                  {ATTENDANCE_COLUMNS.map((status) => (
                    <th
                      key={status}
                      className="w-[4.5rem] px-2 py-3 text-center"
                      title={t.attendance.statuses[status]}
                    >
                      <span
                        className={cn(
                          "inline-flex h-6 min-w-9 items-center justify-center rounded-md px-1.5 text-[11px] font-bold tracking-wide",
                          attendanceTone(status),
                        )}
                      >
                        {ATTENDANCE_CODE[status]}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {summaryRows.map((studentId) => {
                  const counts = draft.attendance[studentId]!;
                  const issues =
                    counts.late_justified +
                    counts.late_unjustified +
                    counts.absence_justified +
                    counts.absence_unjustified;
                  return (
                    <tr
                      key={studentId}
                      className="transition-colors hover:bg-surface-muted/40"
                    >
                      <td className="px-5 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-50 text-[11px] font-bold text-brand-700 dark:bg-brand-950/40 dark:text-brand-300">
                            {initials(draft.studentNames[studentId])}
                          </span>
                          <span className="truncate font-semibold text-foreground">
                            {draft.studentNames[studentId] ?? studentId.slice(0, 6)}
                          </span>
                          {issues === 0 ? (
                            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                              {c.attendanceClean}
                            </span>
                          ) : null}
                        </div>
                      </td>
                      {ATTENDANCE_COLUMNS.map((status) => {
                        const value = counts[status];
                        return (
                          <td key={status} className="px-2 py-2.5 text-center">
                            {value > 0 ? (
                              <span
                                className={cn(
                                  "inline-flex h-7 min-w-7 items-center justify-center rounded-lg px-1.5 text-sm font-bold tabular-nums",
                                  attendanceTone(status),
                                )}
                              >
                                {value}
                              </span>
                            ) : (
                              <span className="text-foreground/20">·</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-border bg-surface-muted/50">
                  <td className="px-5 py-2.5 text-xs font-bold uppercase tracking-wide text-foreground/50">
                    {c.attendanceTotals}
                  </td>
                  {columnTotals.map(({ status, total }) => (
                    <td
                      key={status}
                      className="px-2 py-2.5 text-center text-sm font-bold tabular-nums text-foreground/70"
                    >
                      {total > 0 ? total : <span className="text-foreground/25">0</span>}
                    </td>
                  ))}
                </tr>
              </tfoot>
            </table>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-border/60 px-5 py-2.5 text-[11px] font-medium text-foreground/50">
            {ATTENDANCE_COLUMNS.map((status) => (
              <span key={status} className="inline-flex items-center gap-1.5">
                <span
                  className={cn("h-2.5 w-2.5 rounded-full", attendanceDot(status))}
                />
                <span className="font-bold text-foreground/65">
                  {ATTENDANCE_CODE[status]}
                </span>
                {t.attendance.statuses[status]}
              </span>
            ))}
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
    );

  if (presentation === "embedded") {
    return <div>{body}</div>;
  }

  if (presentation === "collapsible") {
    return (
      <section className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
        <ReportExpandable
          title={c.attendanceTitle}
          subtitle={attendanceSummaryLine(draft, c)}
          badge={
            draft.attendanceLog.length > 0
              ? c.itemCount(draft.attendanceLog.length)
              : undefined
          }
          defaultOpen={false}
        >
          {body}
        </ReportExpandable>
      </section>
    );
  }

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
      {body}
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
        "inline-flex w-[5.25rem] items-center justify-center rounded-full px-2 py-0.5 text-center text-[11px] font-semibold leading-5",
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
