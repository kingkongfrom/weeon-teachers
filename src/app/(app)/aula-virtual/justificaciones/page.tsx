import { FileCheck } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { JustificationInboxList } from "@/components/attendance/justification-inbox-list";
import { loadJustificationInbox } from "@/lib/dashboard/justification-inbox";
import { TONE_WELL } from "@/lib/dashboard/tones";
import { getT } from "@/lib/i18n/server";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

/** Pending parent justifications for the teacher's classes. */
export default async function JustificacionesPage() {
  const t = await getT();
  const a = t.attendance;
  const items = await loadJustificationInbox();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={a.inboxTitle} description={a.inboxHint} backHref="/aula-virtual" />

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-surface px-6 py-16 text-center">
          <span className={cn("flex h-12 w-12 items-center justify-center rounded-xl", TONE_WELL.green)}>
            <FileCheck className="h-6 w-6" strokeWidth={2.2} />
          </span>
          <p className="text-sm font-medium text-foreground/60">{a.inboxEmpty}</p>
        </div>
      ) : (
        <JustificationInboxList items={items} />
      )}
    </div>
  );
}
