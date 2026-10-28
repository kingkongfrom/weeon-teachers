"use client";

import { cn } from "@/lib/utils";
import { useLiveT } from "@/lib/i18n/client";
import { PASS_MARK, tonePillClass } from "@/components/grades/score-cells";
import type { ClassStats } from "@/lib/dashboard/scoreboard";

/** Bands the grade pills use, kept in one place for the summary + legend. */
const BANDS = [
  { key: "pass", tone: tonePillClass(100) },
  { key: "warn", tone: tonePillClass(60) },
  { key: "fail", tone: tonePillClass(0) },
] as const;

/**
 * Dirección-facing summary of one subject: the numbers a coordinator reads
 * before opening the table.
 *
 * The range is drawn as a track rather than `51–96%` because two numbers say
 * the spread but not the distribution: on the bar you see *where* the class
 * sits relative to the pass mark and how wide the gap is.
 */
export function ScoreboardSummary({
  average,
  median,
  passRate,
  highest,
  lowest,
  graded,
  total,
}: Pick<
  ClassStats,
  "average" | "median" | "passRate" | "highest" | "lowest" | "graded" | "total"
>) {
  const t = useLiveT();
  const s = t.gradebook.workspace.scoreboard;
  const ungraded = total - graded;

  return (
    <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border bg-border xl:grid-cols-4">
      <Cell label={s.finalAverage} hint={s.gradedOf(graded, total)}>
        <Value value={average} suffix="%" fallback="—" />
      </Cell>

      <Cell label={s.passRate} hint={s.passHint}>
        <Value value={passRate} suffix="%" fallback="—" />
      </Cell>

      <Cell label={s.range} hint={s.rangeHint} className="col-span-2 xl:col-span-1">
        <RangeBar lowest={lowest} highest={highest} median={median} />
      </Cell>

      <Cell
        label={s.pending}
        hint={s.pendingHint}
        emphasis={ungraded > 0 ? "warn" : undefined}
        className="col-span-2 xl:col-span-1"
      >
        <span
          className={cn(
            "text-2xl font-bold leading-none tabular-nums",
            ungraded > 0 ? "text-[#92400e] dark:text-[#fde68a]" : "text-foreground/65",
          )}
        >
          {ungraded}
        </span>
      </Cell>
    </dl>
  );
}

function Cell({
  label,
  hint,
  emphasis,
  className,
  children,
}: {
  label: string;
  hint: string;
  emphasis?: "warn";
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex flex-col justify-between gap-2 bg-surface px-3.5 py-3",
        className,
      )}
    >
      <dt className="text-[10px] font-bold uppercase tracking-[0.12em] text-foreground/65">
        {label}
      </dt>
      <dd className="flex flex-col gap-1.5">
        {children}
        <span
          className={cn(
            "text-[11px] font-medium",
            emphasis === "warn" ? "text-[#92400e] dark:text-[#fde68a]" : "text-foreground/65",
          )}
        >
          {hint}
        </span>
      </dd>
    </div>
  );
}

function Value({
  value,
  suffix,
  fallback,
}: {
  value: number | null;
  suffix: string;
  fallback: string;
}) {
  return (
    <span
      className={cn(
        "font-bold leading-none tabular-nums",
        value == null ? "text-2xl text-foreground/30" : cn("text-2xl", toneText(value)),
      )}
    >
      {value == null ? fallback : `${value}${suffix}`}
    </span>
  );
}

/**
 * min → max across the 0–100 scale with two markers: the pass line and the
 * **median** (a diamond), which shows where the middle student sits and so
 * whether the average is being dragged by an outlier. A collapsed range
 * (min = max) still renders a dot, so "everyone has 88" reads correctly
 * instead of looking like a missing bar.
 */
function RangeBar({
  lowest,
  highest,
  median,
}: {
  lowest: number | null;
  highest: number | null;
  median: number | null;
}) {
  const s = useLiveT().gradebook.workspace.scoreboard;
  if (lowest == null || highest == null) {
    return <span className="text-2xl font-bold leading-none text-foreground/30">—</span>;
  }
  const clamp = (value: number) => Math.max(0, Math.min(100, value));
  const left = clamp(Math.min(lowest, highest));
  const right = clamp(Math.max(lowest, highest));
  const collapsed = right - left < 1;
  const mid = median == null ? null : clamp(median);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2 text-sm font-bold tabular-nums">
        <span className={toneText(left)}>{Math.round(left)}%</span>
        <span className={toneText(right)}>{Math.round(right)}%</span>
      </div>
      <div className="relative h-1.5 w-full rounded-full bg-foreground/10">
        {/* Bands, so the track itself explains what is pass / warn / fail. */}
        <div className="absolute inset-0 flex overflow-hidden rounded-full">
          {BANDS.map((band) => (
            <span key={band.key} className={cn("h-full flex-1 opacity-30", band.tone)} />
          ))}
        </div>
        <span
          className={cn(
            "absolute top-0 h-full rounded-full",
            collapsed ? "w-1.5" : "",
            tonePillClass((left + right) / 2),
          )}
          style={
            collapsed
              ? { left: `calc(${left}% - 3px)` }
              : { left: `${left}%`, width: `${right - left}%` }
          }
        />
        <span
          aria-hidden
          className="absolute -top-0.5 h-2.5 w-px bg-foreground/50"
          style={{ left: `${PASS_MARK}%` }}
          title={s.passMark(PASS_MARK)}
        />
        {/* Median: a ringed diamond, visually distinct from the pass tick.
            Decorative — the value is already spelled out in the caption below,
            and `aria-label` is not permitted on a bare span. */}
        {mid != null ? (
          <span
            aria-hidden
            title={s.median(mid)}
            className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-[1px] border border-surface bg-foreground/80"
            style={{ left: `${mid}%` }}
          />
        ) : null}
      </div>
      <div className="flex items-baseline justify-between gap-2 text-[10px] font-medium text-foreground/65">
        <span>{s.passMark(PASS_MARK)}</span>
        {mid != null ? (
          <span className="tabular-nums text-foreground/65">{s.median(mid)}</span>
        ) : (
          <span />
        )}
      </div>
    </div>
  );
}

function toneText(value: number): string {
  if (value >= PASS_MARK) return "text-[#0f766e] dark:text-[#6ee7d7]";
  if (value >= 50) return "text-[#92400e] dark:text-[#fde68a]";
  return "text-[#9f1239] dark:text-[#fda4af]";
}
