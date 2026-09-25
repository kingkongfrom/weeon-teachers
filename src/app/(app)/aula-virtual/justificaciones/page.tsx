import Link from "next/link";
import { FileCheck } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { JustificationDecision } from "@/components/attendance/justification-decision";
import { loadJustificationInbox } from "@/lib/dashboard/justification-inbox";
import { getLocale, getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

function formatDay(iso: string, locale: string): string {
  const date = new Date(`${iso.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "es-CR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

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
        <ul className="flex flex-col gap-3">
          {items.map((item) => (
            <li key={item.recordId} className="rounded-2xl border border-border bg-surface p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{item.studentName}</p>
                  <p className="mt-0.5 text-xs font-medium text-foreground/50">
                    {[a.statuses[item.status], formatDay(item.date, locale), item.groupName]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                <Link
                  href={`/aula-virtual/${item.classId}?tab=asistencia&date=${item.date}`}
                  className="text-xs font-semibold text-brand-600"
                >
                  {a.openInRegister}
                </Link>
              </div>
              <p className="mt-3 text-sm text-foreground/80">{item.note}</p>
              {item.attachmentUrl ? (
                item.attachmentPath?.endsWith(".pdf") ? (
                  <a
                    href={item.attachmentUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-block text-sm font-semibold text-brand-600"
                  >
                    PDF
                  </a>
                ) : (
                  <a href={item.attachmentUrl} target="_blank" rel="noreferrer" className="mt-3 inline-block">
                    <img
                      src={item.attachmentUrl}
                      alt={a.guardianNote}
                      className="h-24 w-24 rounded-lg object-cover"
                    />
                  </a>
                )
              ) : null}
              <div className="mt-3">
                <JustificationDecision recordId={item.recordId} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
