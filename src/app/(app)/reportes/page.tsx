import Link from "next/link";
import { FileText } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { ReportPreviewPanels } from "@/components/reports/report-preview-panels";
import {
  loadMyReports,
  submittedReportAsDraft,
  type SubmittedReport,
} from "@/lib/dashboard/reports";
import { schoolPeriodLabel } from "@/lib/dashboard/school-period";
import { getLocale, getT } from "@/lib/i18n/server";

export default async function ReportesPage() {
  const reports = await loadMyReports();
  const t = await getT();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t.reportes.title}
        description={
          reports.length === 0 ? t.reportes.descriptionEmpty : t.reportes.description
        }
        backHref="/inicio"
      />

      {reports.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface px-6 py-16 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950/40 dark:text-brand-300">
            <FileText className="h-6 w-6" strokeWidth={2.2} />
          </div>
          <p className="text-sm font-medium text-foreground/60">{t.reportes.empty}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-10">
          {reports.map((report) => (
            <ReportCard key={`${report.classId}-${report.submittedAt}`} report={report} />
          ))}
        </div>
      )}
    </div>
  );
}

async function ReportCard({ report }: { report: SubmittedReport }) {
  const [t, locale] = await Promise.all([getT(), getLocale()]);
  const draft = submittedReportAsDraft(report);

  return (
    <article className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <Link
          href={`/grupos/${report.classId}`}
          className="-mx-1 rounded px-1 text-base font-semibold text-foreground transition-colors hover:bg-brand-50 hover:text-brand-700 dark:hover:bg-brand-950/40 dark:hover:text-brand-300"
        >
          {report.groupName}
        </Link>
        {report.subjectName ? (
          <span className="text-xs font-semibold text-brand-700 dark:text-brand-300">
            {report.subjectName}
          </span>
        ) : null}
        <span className="text-xs font-medium text-foreground/50">
          {report.period || schoolPeriodLabel(report.submittedAt, locale)}
        </span>
        {wasResubmitted(report) ? (
          <span
            className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
            title={new Date(report.updatedAt).toLocaleString("es-CR")}
          >
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

      <ReportPreviewPanels draft={draft} />
    </article>
  );
}

function wasResubmitted(report: SubmittedReport): boolean {
  const updated = new Date(report.updatedAt).getTime();
  const submitted = new Date(report.submittedAt).getTime();
  if (Number.isNaN(updated) || Number.isNaN(submitted)) return false;
  return updated - submitted > 1000;
}
