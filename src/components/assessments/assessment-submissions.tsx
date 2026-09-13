"use client";

import Link from "next/link";
import { ChevronRight, ClipboardCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocale, useT } from "@/lib/i18n/client";
import type { SubmissionSummary } from "@/lib/dashboard/submissions";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return `${parts[0][0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
}

function submittedLabel(iso: string | null, locale: string): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString(locale, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** "Entregas" list on a published assignment: who submitted, who is still
 * pending, and a link into the grader for each student. */
export function AssessmentSubmissions({
  classId,
  assessmentId,
  studentCount,
  submissions,
  maxMarks,
}: {
  classId: string;
  assessmentId: string;
  studentCount: number;
  submissions: SubmissionSummary[];
  maxMarks: number;
}) {
  const t = useT();
  const g = t.assessments.grading;
  const locale = useLocale() === "en" ? "en-US" : "es-CR";

  const gradedCount = submissions.filter((item) => item.state === "returned").length;
  const pendingCount = submissions.length - gradedCount;

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-border bg-surface px-5 py-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold uppercase tracking-wide text-foreground/50">
            {g.panelTitle}
          </h2>
          {submissions.length > 0 ? (
            <span className="text-xs font-semibold text-foreground/45">
              {g.panelHint(gradedCount, submissions.length)}
            </span>
          ) : null}
        </div>
        {pendingCount > 0 ? (
          <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
            {g.pendingCount(pendingCount)}
          </span>
        ) : submissions.length > 0 ? (
          <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
            {g.statusReturned}
          </span>
        ) : null}
      </div>

      {studentCount === 0 || submissions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-4 py-3">
          <p className="text-sm font-semibold text-foreground/60">{g.emptyTitle}</p>
          <p className="mt-0.5 text-xs font-medium text-foreground/45">{g.emptyBody}</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {submissions.map((submission) => {
            const returned = submission.state === "returned";
            const when = submittedLabel(submission.submittedAt, locale);
            return (
              <li key={submission.id}>
                <Link
                  href={`/aula-virtual/${classId}/evaluaciones/${assessmentId}/entregas/${submission.id}`}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-background p-3 transition-colors hover:border-brand-200 hover:bg-brand-50/40 dark:hover:bg-brand-950/20"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full brand-gradient text-xs font-bold text-white">
                    {initials(submission.studentName)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {submission.studentName}
                    </p>
                    <p className="mt-0.5 text-[11px] font-medium text-foreground/45">
                      {when ? `${g.submittedAt}: ${when}` : g.statusPending}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide",
                      returned
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                        : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
                    )}
                  >
                    {returned
                      ? g.gradeValue(Math.round(submission.grade ?? 0), Math.round(maxMarks))
                      : g.statusPending}
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-foreground/30" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {submissions.length > 0 && pendingCount === 0 ? (
        <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
          <ClipboardCheck className="h-3.5 w-3.5" />
          {g.allGraded}
        </p>
      ) : null}
    </section>
  );
}
