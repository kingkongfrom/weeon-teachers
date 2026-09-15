"use client";

import Link from "next/link";
import { ArrowRight, FileCheck2 } from "lucide-react";
import { useT } from "@/lib/i18n/client";

type SubmitReportProps = {
  classId: string;
  subjectId?: string | null;
  /** Display name of the active materia — scopes copy to this subject, not the whole group. */
  subjectName?: string | null;
  disabled: boolean;
  /** Full-width table footer row — matches the gradebook header height. */
  variant?: "default" | "footer";
};

function composerHref(classId: string, subjectId: string | null | undefined): string {
  const base = `/grupos/${classId}/reporte`;
  if (subjectId != null) return `${base}?subject=${encodeURIComponent(subjectId)}`;
  return `${base}?subject=__legacy`;
}

/**
 * Opens the report composer where the teacher previews grades, conduct, and
 * attendance before submitting to Reportes.
 */
export function SubmitReport({
  classId,
  subjectId = null,
  subjectName = null,
  disabled,
  variant = "default",
}: SubmitReportProps) {
  const t = useT();
  const isFooter = variant === "footer";
  const label = subjectName
    ? t.gradebook.submit.labelSubject(subjectName)
    : t.gradebook.submit.label;
  const href = composerHref(classId, subjectId);

  if (disabled) {
    return (
      <span
        className={
          isFooter
            ? "flex h-full w-full items-center justify-center gap-2 bg-brand-600/50 px-3 text-sm font-medium text-white/80"
            : "inline-flex items-center gap-2 rounded-lg bg-brand-600/50 px-4 py-2 text-sm font-medium text-white/80"
        }
        aria-disabled
      >
        <FileCheck2 className="h-4 w-4 shrink-0" />
        <span className={isFooter ? "truncate" : undefined}>{label}</span>
      </span>
    );
  }

  if (isFooter) {
    return (
      <Link
        href={href}
        aria-label={label}
        className="flex h-full w-full items-center justify-center gap-2 bg-brand-600 px-3 text-sm font-medium text-white transition-colors hover:bg-brand-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500/40"
      >
        <FileCheck2 className="h-4 w-4 shrink-0" />
        <span className="truncate">{label}</span>
        <ArrowRight className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
      </Link>
    );
  }

  return (
    <Link
      href={href}
      aria-label={label}
      className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
    >
      <FileCheck2 className="h-4 w-4 shrink-0" />
      {label}
      <ArrowRight className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
    </Link>
  );
}
