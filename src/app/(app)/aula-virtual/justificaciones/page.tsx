import { FileCheck } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { JustificationInboxList } from "@/components/attendance/justification-inbox-list";
import { loadJustificationInbox } from "@/lib/dashboard/justification-inbox";
import { getLocale, getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

/** Pending parent justifications for the teacher's classes. */
export default async function JustificacionesPage() {
  const t = await getT();
  const locale = await getLocale();
  const a = t.attendance;
  const items = await loadJustificationInbox();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={a.inboxTitle} description={a.inboxHint} backHref="/aula-virtual" />

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-surface px-6 py-16 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300">
            <FileCheck className="h-6 w-6" strokeWidth={2.2} />
          </span>
          <p className="text-sm font-medium text-foreground/60">{a.inboxEmpty}</p>
        </div>
      ) : (
        <JustificationInboxList
          items={items}
          locale={locale}
          labels={{
            guardianNote: a.guardianNote,
            openInRegister: a.openInRegister,
            inboxEmpty: a.inboxEmpty,
            statuses: a.statuses,
          }}
        />
      )}
    </div>
  );
}
