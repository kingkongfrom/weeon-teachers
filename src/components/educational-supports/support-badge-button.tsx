"use client";

import { HandHeart } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/client";

export function EducationalSupportBadgeButton({
  needsReview,
  needsPeriodRegistration = false,
  count,
  onClick,
  className,
}: {
  needsReview: boolean;
  needsPeriodRegistration?: boolean;
  count: number;
  onClick: () => void;
  className?: string;
}) {
  const t = useT();
  if (count <= 0) return null;

  const pending = needsReview || needsPeriodRegistration;
  const title = needsReview
    ? t.educationalSupports.badgePendingRead
    : needsPeriodRegistration
      ? t.educationalSupports.badgePendingRegistration
      : t.educationalSupports.badgeReviewed;

  return (
    <button
      type="button"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onClick();
      }}
      title={title}
      className={cn(
        "inline-flex h-6 shrink-0 items-center gap-1 rounded-full px-2 text-[10px] font-bold uppercase tracking-wide transition-colors",
        pending
          ? "bg-amber-100 text-amber-900 ring-1 ring-amber-300/80 hover:bg-amber-200 dark:bg-amber-950/50 dark:text-amber-200 dark:ring-amber-800"
          : "bg-brand-50 text-brand-700 hover:bg-brand-100 dark:bg-brand-950/40 dark:text-brand-300",
        className,
      )}
    >
      <HandHeart className="h-3 w-3" strokeWidth={2.25} />
      {count}
    </button>
  );
}
