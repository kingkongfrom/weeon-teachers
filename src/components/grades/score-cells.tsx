"use client";

import { cn } from "@/lib/utils";

/** Grade bands used everywhere in the scoreboard (pass = 70). */
export const PASS_MARK = 70;

export function gradeTone(value: number | null): "pass" | "warn" | "fail" | "none" {
  if (value == null) return "none";
  if (value >= PASS_MARK) return "pass";
  if (value >= 50) return "warn";
  return "fail";
}

const TONE_PILL: Record<ReturnType<typeof gradeTone>, string> = {
  pass: "bg-[#abe3dc] text-[#0f4c47] dark:bg-[#0f2f2c] dark:text-[#6ee7d7]",
  warn: "bg-[#fdeecd] text-[#92400e] dark:bg-[#3a2a12] dark:text-[#fde68a]",
  fail: "bg-[#fbdee7] text-[#9f1239] dark:bg-[#3a1622] dark:text-[#fda4af]",
  none: "text-foreground/65",
};

export function tonePillClass(value: number | null): string {
  return TONE_PILL[gradeTone(value)];
}

/**
 * A rubro total in the presentation a scoreboard needs.
 *
 * - `points`: the **points earned** with the **grade** beside them
 *   (`28 / 30 · 93%`) — evidence and result in one cell.
 * - `percent`: the **grade alone** (`93%`), for a reader who only wants the
 *   result (dirección).
 *
 * Points without a grade are unreadable, and a grade without points loses the
 * evidence, so both are shown in the default view.
 */
export function RubroTotalCell({
  points,
  max,
  grade,
  view = "points",
  compact = false,
}: {
  points: number | null;
  max: number;
  grade: number | null;
  view?: "points" | "percent";
  compact?: boolean;
}) {
  if (grade == null) {
    return <span className={cn("tabular-nums", TONE_PILL.none)}>—</span>;
  }
  const showPoints = view === "points" && points != null && max > 0;
  return (
    <span className="inline-flex items-baseline justify-center gap-1 tabular-nums">
      {showPoints ? (
        <span className="text-sm font-bold leading-none text-foreground">
          {formatPoints(points)}
          <span className="ml-0.5 text-[10px] font-semibold text-foreground/65">
            /{formatPoints(max)}
          </span>
        </span>
      ) : null}
      <span
        className={cn(
          "inline-block rounded-md px-1.5 py-0.5 font-bold leading-none",
          compact || !showPoints ? "text-[11px]" : "text-[10px]",
          TONE_PILL[gradeTone(grade)],
        )}
      >
        {Math.round(grade)}%
      </span>
    </span>
  );
}

export function formatPoints(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Math.round(value * 10) / 10);
}
