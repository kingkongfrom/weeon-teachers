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
  narrow = false,
}: {
  points: number | null;
  max: number;
  grade: number | null;
  view?: "points" | "percent";
  compact?: boolean;
  /**
   * Small screens (a landscape phone, a portrait tablet at the compact
   * density). The subtotal column is then 72 px wide, so the evidence is
   * shortened, never allowed to overflow: points are rounded and the max
   * becomes `/30`, the grade drops the `%` when it is 100, since `28/30 100`
   * still reads as "28 of 30, full marks".
   */
  narrow?: boolean;
}) {
  if (grade == null) {
    return <span className={cn("tabular-nums", TONE_PILL.none)}>—</span>;
  }
  const showPoints = view === "points" && points != null && max > 0;
  const rounded = Math.round(grade);
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-baseline justify-center gap-1 tabular-nums",
        narrow && "flex-wrap gap-x-0.5",
      )}
    >
      {showPoints ? (
        <span
          className={cn(
            "font-bold leading-none text-foreground",
            narrow ? "text-[4px]" : "text-sm",
          )}
        >
          {formatPoints(points)}
          <span className="ml-0.5 text-[10px] font-semibold text-foreground/65">
            /{formatPoints(max)}
          </span>
        </span>
      ) : null}
      <span
        className={cn(
          "inline-block shrink-0 rounded-md font-bold leading-none",
          narrow ? "px-1 py-0.5 text-[4.5px]" : "px-1.5 py-0.5",
          !narrow && (compact || !showPoints ? "text-[11px]" : "text-[10px]"),
          TONE_PILL[gradeTone(grade)],
        )}
      >
        {rounded === 100 && narrow && showPoints ? rounded : `${rounded}%`}
      </span>
    </span>
  );
}

export function formatPoints(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Math.round(value * 10) / 10);
}
