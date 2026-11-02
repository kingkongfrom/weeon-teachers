"use client";

import Link from "next/link";
import { Fragment, useMemo, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { ReportPreviewPanels } from "@/components/reports/report-preview-panels";
import { classGradeStats } from "@/lib/reports/breakdowns";
import { collectReportStudentIds } from "@/lib/reports/grades";
import {
  sortSubmittedReports,
  submittedReportAsDraft,
  submittedReportKey,
  type SubmittedReport,
} from "@/lib/reports/submitted-view";
import { schoolPeriodLabel } from "@/lib/dashboard/school-period";
import { hubToneSurface } from "@/lib/dashboard/tones";
import { useLiveLocale, useLiveT } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

type Props = {
  reports: SubmittedReport[];
};

function formatPercent(value: number | null): string {
  return value === null ? "—" : `${Math.round(value)}%`;
}

function formatSubmittedAt(iso: string, locale: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function ReportsSubmittedList({ reports }: Props) {
  const t = useLiveT();
  const locale = useLiveLocale();
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  const sorted = useMemo(() => sortSubmittedReports(reports), [reports]);

  const rows = useMemo(() => {
    return sorted.map((report) => {
      const studentIds = collectReportStudentIds(report);
      const stats = classGradeStats(report.grades, studentIds);
      const period =
        report.period?.trim() || schoolPeriodLabel(report.submittedAt, locale);
      return { report, stats, period, key: submittedReportKey(report) };
    });
  }, [sorted, locale]);

  function toggle(key: string) {
    setExpandedKey((current) => (current === key ? null : key));
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="overflow-hidden sm:rounded-2xl sm:border sm:border-border sm:bg-surface sm:shadow-sm">
        <div className="border-b border-border/70 px-1 py-3 sm:px-5">
          <p className="text-sm font-semibold text-foreground">{t.reportes.listTitle}</p>
          <p className="mt-0.5 text-xs font-medium text-foreground/50">{t.reportes.listHint}</p>
        </div>
        <div
          className={cn(
            "hidden overflow-x-auto sm:block",
            rows.length > 8 && "max-h-[min(22rem,52vh)] overflow-y-auto",
          )}
        >
          <table className="w-full min-w-[36rem] text-left text-sm">
            <thead className="sticky top-0 z-[1] border-b border-border/70 bg-surface/95 text-xs font-semibold uppercase tracking-wide text-foreground/50 backdrop-blur-sm">
              <tr>
                <th className="px-5 py-2.5">{t.reportes.group}</th>
                <th className="px-3 py-2.5">{t.reportes.listColPeriod}</th>
                <th className="px-3 py-2.5">{t.reportes.listColSubject}</th>
                <th className="px-3 py-2.5 text-right">{t.reportes.average}</th>
                <th className="px-3 py-2.5 text-right">{t.reportes.listColSubmitted}</th>
                <th className="px-5 py-2.5 text-right">{t.reportes.listColDetail}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {rows.map(({ report, stats, period, key }) => {
                const expanded = expandedKey === key;
                return (
                  <Fragment key={key}>
                    <tr
                      className={cn(
                        "transition-colors",
                        expanded ? "bg-brand-50/50 dark:bg-brand-950/20" : "hover:bg-surface-muted/40",
                      )}
                    >
                      <td className="px-5 py-2.5 font-semibold text-foreground">
                        <Link
                          href={`/grupos/${report.classId}`}
                          className="hover:text-brand-700 hover:underline dark:hover:text-brand-300"
                        >
                          {report.groupName}
                        </Link>
                      </td>
                      <td className="px-3 py-2.5 text-foreground/70">{period}</td>
                      <td className="px-3 py-2.5 font-medium text-foreground/85">
                        {report.subjectName ?? "—"}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-foreground">
                        {formatPercent(stats.average)}
                      </td>
                      <td className="px-3 py-2.5 text-right text-xs tabular-nums text-foreground/55">
                        {formatSubmittedAt(report.submittedAt, locale)}
                      </td>
                      <td className="px-5 py-2.5 text-right">
                        <button
                          type="button"
                          onClick={() => toggle(key)}
                          aria-expanded={expanded}
                          className={cn(
                            "inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-xs font-semibold transition-colors",
                            expanded
                              ? "bg-brand-600 text-white"
                              : "bg-surface-muted text-foreground/70 hover:bg-surface-muted/80",
                          )}
                        >
                          {expanded ? t.reportes.listHide : t.reportes.listView}
                          {expanded ? (
                            <ChevronUp className="h-3.5 w-3.5" aria-hidden />
                          ) : (
                            <ChevronDown className="h-3.5 w-3.5" aria-hidden />
                          )}
                        </button>
                      </td>
                    </tr>
                    {expanded ? (
                      <tr>
                        <td colSpan={6} className="border-b border-border/60 bg-surface-muted/20 px-3 py-3">
                          <SubmittedReportDetail report={report} />
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex flex-col gap-2.5 pb-2.5 sm:hidden">
          {rows.map(({ report, stats, period, key }) => {
            const expanded = expandedKey === key;
            const average = formatPercent(stats.average);
            const failing = stats.average !== null && stats.average < 70;
            return (
              <article
                key={key}
                className={cn(
                  "mx-1.5 overflow-hidden rounded-2xl border border-border/70 bg-surface",
                  expanded && "ring-2 ring-brand-600/30",
                )}
              >
                <div className="flex items-start justify-between gap-3 px-3 pt-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/grupos/${report.classId}`}
                        className="text-sm font-bold text-foreground hover:text-brand-700 hover:underline dark:hover:text-brand-300"
                      >
                        {report.groupName}
                      </Link>
                      <span className="truncate text-[13px] font-semibold text-foreground/80">
                        {report.subjectName ?? "—"}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-foreground/50">
                      {period} · {formatSubmittedAt(report.submittedAt, locale)}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p
                      className={cn(
                        "text-xl font-bold tabular-nums",
                        failing ? "text-rose-600 dark:text-rose-400" : "text-foreground",
                      )}
                    >
                      {average}
                    </p>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-foreground/45">
                      {t.reportes.average}
                    </p>
                  </div>
                </div>
                <div className="mt-2.5 flex justify-end border-t border-border/50 px-2 py-2">
                  <button
                    type="button"
                    onClick={() => toggle(key)}
                    aria-expanded={expanded}
                    className={cn(
                      "inline-flex h-8 items-center gap-1 rounded-full px-3 text-xs font-semibold transition-colors",
                      expanded
                        ? "bg-brand-600 text-white"
                        : "bg-surface-muted text-foreground/70 hover:bg-surface-muted/80",
                    )}
                  >
                    {expanded ? t.reportes.listHide : t.reportes.listView}
                    {expanded ? (
                      <ChevronUp className="h-3.5 w-3.5" aria-hidden />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5" aria-hidden />
                    )}
                  </button>
                </div>
                {expanded ? (
                  <div className="border-t border-border/50 pt-3">
                    <SubmittedReportDetail report={report} compact />
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function SubmittedReportDetail({
  report,
  compact = false,
}: {
  report: SubmittedReport;
  compact?: boolean;
}) {
  const t = useLiveT();
  const draft = useMemo(() => submittedReportAsDraft(report), [report]);
  const resubmitted =
    new Date(report.updatedAt).getTime() - new Date(report.submittedAt).getTime() > 1000;

  return (
    <article className={cn("flex min-w-0 flex-col", compact ? "gap-0" : "gap-4")}>
      <div className={cn("flex flex-wrap items-center gap-x-3 gap-y-1", compact && "pb-3")}>
        {compact ? null : (
          <span className="text-sm font-semibold text-foreground">{report.groupName}</span>
        )}
        {compact || !report.subjectName ? null : (
          <span className="text-xs font-semibold text-brand-700 dark:text-brand-300">
            {report.subjectName}
          </span>
        )}
        {resubmitted ? (
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[11px] font-semibold",
              hubToneSurface("yellow"),
              compact && "ml-[5px]",
            )}
          >
            {t.reportes.updated}
          </span>
        ) : null}
      </div>

      {report.teacherNotes ? (
        <div className={cn("rounded-xl border border-border bg-surface px-4 py-3", compact && "mx-3 pb-3 mb-3")}>
          <p className="text-xs font-semibold uppercase tracking-wide text-foreground/45">
            {t.composer.teacherNotes}
          </p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-foreground/80">{report.teacherNotes}</p>
        </div>
      ) : null}

      <div className={cn("flex min-w-0 flex-col gap-4", compact && "gap-0")}>
        <ReportPreviewPanels draft={draft} variant="archive" />
      </div>
    </article>
  );
}
