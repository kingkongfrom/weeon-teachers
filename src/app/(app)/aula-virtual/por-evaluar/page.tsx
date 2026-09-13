import Link from "next/link";
import { ChevronRight, ClipboardCheck } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { loadGradingInbox } from "@/lib/dashboard/grading-inbox";
import { getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

function submittedLabel(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString("es-CR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Cross-group "Por evaluar" inbox: every ungraded turn-in, oldest first. */
export default async function PorEvaluarPage() {
  const t = await getT();
  const g = t.assessments.grading;
  const items = await loadGradingInbox();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={g.inboxTitle} description={g.inboxHint} backHref="/aula-virtual" />

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-surface px-6 py-16 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300">
            <ClipboardCheck className="h-6 w-6" strokeWidth={2.2} />
          </span>
          <p className="text-sm font-medium text-foreground/60">{g.allGraded}</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((item) => {
            const when = submittedLabel(item.submittedAt);
            return (
              <li key={item.submissionId}>
                <Link
                  href={`/aula-virtual/${item.classId}/evaluaciones/${item.assessmentId}/entregas/${item.submissionId}`}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3.5 transition-colors hover:border-brand-200 hover:bg-brand-50/40 dark:hover:bg-brand-950/20"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full brand-gradient text-xs font-bold text-white">
                    {item.studentName
                      .split(/\s+/)
                      .slice(0, 2)
                      .map((part) => part[0] ?? "")
                      .join("")
                      .toUpperCase() || "?"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {item.studentName}
                    </p>
                    <p className="mt-0.5 truncate text-xs font-medium text-foreground/50">
                      {[item.assessmentTitle, item.groupName, when].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <span className="hidden shrink-0 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-amber-700 sm:inline-flex dark:bg-amber-950/40 dark:text-amber-300">
                    {g.pendingBadge}
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-foreground/30" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
