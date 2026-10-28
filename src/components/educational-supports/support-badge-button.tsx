"use client";

import { HandHeart } from "lucide-react";
import { cn } from "@/lib/utils";
import { TONE_WELL } from "@/lib/dashboard/tones";
import { useLiveT } from "@/lib/i18n/client";

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
  const t = useLiveT();
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
        pending ? TONE_WELL.yellow : TONE_WELL.blue,
        className,
      )}
    >
      <HandHeart className="h-3 w-3" strokeWidth={2.25} />
      {count}
    </button>
  );
}
