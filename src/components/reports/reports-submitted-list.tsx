"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
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
import { useLocale, useT } from "@/lib/i18n/client";
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
  const t = useT();
  const locale = useLocale();
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
      <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
        <div className="border-b border-border/70 px-5 py-3">
          <p className="text-sm font-semibold text-foreground">{t.reportes.listTitle}</p>
          <p className="mt-0.5 text-xs font-medium text-foreground/50">{t.reportes.listHint}</p>
        </div>
        <div
          className={cn(
            "overflow-x-auto",
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
                  <tr
                    key={key}
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
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {expandedKey ? (
        <SubmittedReportDetail
          report={rows.find((row) => row.key === expandedKey)!.report}
        />
      ) : null}
    </div>
  );
}

function SubmittedReportDetail({ report }: { report: SubmittedReport }) {
  const t = useT();
  const draft = useMemo(() => submittedReportAsDraft(report), [report]);
  const resubmitted =
    new Date(report.updatedAt).getTime() - new Date(report.submittedAt).getTime() > 1000;

  return (
    <article className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="text-sm font-semibold text-foreground">{report.groupName}</span>
        {report.subjectName ? (
          <span className="text-xs font-semibold text-brand-700 dark:text-brand-300">
            {report.subjectName}
          </span>
        ) : null}
        {resubmitted ? (
          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
            {t.reportes.updated}
          </span>
        ) : null}
      </div>

      {report.teacherNotes ? (
        <div className="rounded-xl border border-border bg-surface px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-foreground/45">
            {t.composer.teacherNotes}
          </p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-foreground/80">{report.teacherNotes}</p>
        </div>
      ) : null}

      <ReportPreviewPanels draft={draft} variant="archive" />
    </article>
  );
}
