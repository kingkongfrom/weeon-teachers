import { notFound } from "next/navigation";
import { BackLink } from "@/components/layout/page-header";
import { ReportComposerSubmit } from "@/components/reports/report-composer-submit";
import { ReportPreviewPanels } from "@/components/reports/report-preview-panels";
import { loadReportComposer } from "@/lib/reports/composer";
import { getT } from "@/lib/i18n/server";

export default async function ReportComposerPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ subject?: string }>;
}) {
  const { id } = await params;
  const { subject } = await searchParams;
  const ctx = await loadReportComposer(id, subject);
  if (!ctx) notFound();

  const t = await getT();

  if (!ctx.ok) {
    return (
      <div className="flex flex-col gap-5">
        <BackLink href={ctx.backHref} label={t.composer.backToGradebook} />
        <div className="rounded-2xl border border-border bg-surface px-6 py-10">
          <h1 className="text-xl font-semibold text-foreground">{ctx.groupName}</h1>
          <p className="mt-3 text-sm font-medium text-error">{ctx.error}</p>
        </div>
      </div>
    );
  }

  const { draft, backHref } = ctx;

  return (
    <div className="flex flex-col gap-5">
      <BackLink href={backHref} label={t.composer.backToGradebook} />

      <header className="flex flex-col gap-1">
        <h1 className="brand-page-title text-2xl font-bold text-foreground sm:text-3xl">
          {t.composer.title}
        </h1>
        <p className="text-sm font-medium text-foreground/55">
          {draft.groupName}
          {draft.subjectName ? ` · ${draft.subjectName}` : ""}
          {draft.period ? ` · ${draft.period}` : ""}
        </p>
        <p className="text-xs font-medium text-foreground/45">
          {t.composer.summaryLine(draft.summary.gradedStudents, draft.summary.totalStudents)}
        </p>
      </header>

      <ReportPreviewPanels draft={draft} />
      <ReportComposerSubmit classId={draft.classId} subjectId={draft.subjectId} />
    </div>
  );
}
