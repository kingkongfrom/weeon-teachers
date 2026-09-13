"use client";

import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/client";

const PREVIEW_LIMIT = 4;

/** Who has turned in a published homework/exam. */
export function SubmissionStatus({
  studentCount,
  submittedCount,
  submitterNames,
  compact = false,
}: {
  studentCount: number;
  submittedCount: number;
  submitterNames: string[];
  compact?: boolean;
}) {
  const a = useT().assessments;
  const extra = Math.max(0, submitterNames.length - PREVIEW_LIMIT);
  const preview = extra > 0 ? submitterNames.slice(0, PREVIEW_LIMIT) : submitterNames;
  const names =
    preview.length === 0
      ? null
      : `${preview.join(", ")}${extra > 0 ? ` ${a.moreSubmitters(extra)}` : ""}`;

  return (
    <div className={cn(compact ? "mt-2" : "flex flex-col gap-1")}>
      <p
        className={cn(
          compact ? "text-[11px] font-semibold" : "text-sm font-semibold",
          submittedCount > 0
            ? "text-emerald-700 dark:text-emerald-300"
            : "text-foreground/45",
        )}
      >
        {studentCount === 0 && submittedCount === 0
          ? a.noSubmissions
          : a.submittedCount(submittedCount, studentCount)}
      </p>
      {names ? (
        compact ? (
          <p className="mt-0.5 truncate text-[11px] font-medium text-foreground/55">{names}</p>
        ) : (
          <ul className="mt-1 flex flex-col gap-0.5 text-sm font-medium text-foreground/70">
            {(extra > 0 ? submitterNames : preview).map((name) => (
              <li key={name}>{name}</li>
            ))}
          </ul>
        )
      ) : null}
    </div>
  );
}
