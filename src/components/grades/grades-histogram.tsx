"use client";

import { useMemo } from "react";
import type { ExamColumn } from "@/lib/dashboard/exams";

type GradesHistogramProps = {
  exams: ExamColumn[];
  students: Array<{ id: string; name: string }>;
};

type ExamStat = {
  id: string;
  label: string;
  count: number;
  avg: number | null;
  min: number | null;
  max: number | null;
  passPct: number | null; // share of grades at/above 70% of the column max
};

const BUCKETS = [
  { label: "0–49", min: 0, max: 49 },
  { label: "50–59", min: 50, max: 59 },
  { label: "60–69", min: 60, max: 69 },
  { label: "70–79", min: 70, max: 79 },
  { label: "80–89", min: 80, max: 89 },
  { label: "90–100", min: 90, max: 100 },
];

function bucketFor(pct: number): number {
  for (let i = 0; i < BUCKETS.length; i++) {
    if (pct >= BUCKETS[i].min && pct <= BUCKETS[i].max) return i;
  }
  return BUCKETS.length - 1;
}

/**
 * Per-exam summary: average, min, max and pass share (70% threshold) for each
 * grade column. Compares each exam at a glance without a bulky chart.
 */
export function GradesHistogram({ exams, students }: GradesHistogramProps) {
  const stats = useMemo<ExamStat[]>(() => {
    return exams.map((column) => {
      const max = column.points && column.points > 0 ? column.points : 100;
      const pcts = students
        .map((s) => column.grades[s.id])
        .filter((g): g is NonNullable<typeof g> => Boolean(g))
        .map((g) => (g.mark / max) * 100)
        .sort((a, b) => a - b);

      const n = pcts.length;
      const sum = pcts.reduce((acc, p) => acc + p, 0);
      const pass = pcts.filter((p) => p >= 70).length;

      return {
        id: column.id,
        label: column.title || "Examen",
        count: n,
        avg: n > 0 ? sum / n : null,
        min: n > 0 ? pcts[0] : null,
        max: n > 0 ? pcts[n - 1] : null,
        passPct: n > 0 ? (pass / n) * 100 : null,
      };
    });
  }, [exams, students]);

  const hasData = stats.some((s) => s.count > 0);

  // Whole-group distribution: every grade across all exams, normalized to each
  // column's max, bucketed 0–100. Students with no grade are excluded.
  const distribution = useMemo(() => {
    const counts = BUCKETS.map(() => 0);
    let total = 0;
    for (const column of exams) {
      const max = column.points && column.points > 0 ? column.points : 100;
      for (const grade of Object.values(column.grades)) {
        counts[bucketFor((grade.mark / max) * 100)] += 1;
        total += 1;
      }
    }
    return { counts, total };
  }, [exams]);

  // Nothing to show until at least one grade exists.
  if (!hasData) return null;

  return (
    <div className="flex flex-col rounded-xl border border-border bg-surface p-4">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h3 className="truncate text-sm font-bold text-foreground">Resumen por examen</h3>
        <span className="shrink-0 text-xs font-medium text-foreground/50">% de nota</span>
      </div>

      <div className="space-y-4">
        {stats.map((stat) => (
          <div key={stat.id} className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-2">
              <span className="truncate text-xs font-semibold uppercase tracking-wide text-foreground/80" title={stat.label}>
                {stat.label}
              </span>
              <span className="shrink-0 text-[11px] font-medium text-foreground/45">
                {stat.count} nota{stat.count === 1 ? "" : "s"}
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2">
              <StatCell label="Prom" value={stat.avg} />
              <StatCell label="Mín" value={stat.min} />
              <StatCell label="Máx" value={stat.max} />
              <StatCell label="Aprob." value={stat.passPct} suffix="%" />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 border-t border-border pt-4">
        <div className="mb-3 flex items-baseline justify-between gap-2">
          <h3 className="truncate text-sm font-bold text-foreground">Distribución del grupo</h3>
          <span className="shrink-0 text-xs font-medium text-foreground/50">
            {distribution.total} nota{distribution.total === 1 ? "" : "s"}
          </span>
        </div>
        <DistributionChart counts={distribution.counts} />
      </div>
    </div>
  );
}

function DistributionChart({ counts }: { counts: number[] }) {
  const max = Math.max(...counts, 1);
  // Y-axis ticks: 0 → max, in whole-number steps that look clean.
  const yTicks = useMemo(() => {
    const step = max <= 4 ? 1 : max <= 8 ? 2 : max <= 15 ? 5 : Math.ceil(max / 5);
    const ticks: number[] = [];
    for (let v = 0; v <= max; v += step) ticks.push(v);
    return ticks;
  }, [max]);

  return (
    <>
      <div className="flex gap-2">
        {/* Y axis: gridlines + labels (0 at the baseline, max on top) */}
        <div className="relative flex h-28 w-6 shrink-0 flex-col-reverse justify-between text-right">
          {yTicks.map((tick) => (
            <span
              key={tick}
              className="pointer-events-none relative right-0 text-[9px] font-medium leading-none tabular-nums text-foreground/40"
            >
              {tick}
            </span>
          ))}
        </div>

        {/* Bars + horizontal gridlines */}
        <div className="relative flex h-28 flex-1">
          {/* gridlines aligned to tick positions */}
          <div className="absolute inset-0 flex flex-col-reverse justify-between">
            {yTicks.map((tick) => (
              <div
                key={tick}
                className="w-full border-t border-dashed border-border/50"
                style={tick === 0 ? { borderBottomWidth: 1 } : undefined}
              />
            ))}
          </div>

          <div className="relative flex h-full flex-1 items-end gap-px">
            {counts.map((count, index) => {
              const height = (count / max) * 100;
              return (
                <div key={BUCKETS[index].label} className="group relative flex h-full flex-1 flex-col justify-end">
                  <div
                    className="w-full rounded-t-md bg-brand-500/70 transition-all duration-300 group-hover:bg-brand-400/80 dark:bg-brand-400/60 dark:group-hover:bg-brand-300/70"
                    style={{ height: count === 0 ? 2 : `${Math.max(height, 4)}%` }}
                  />
                  {count > 0 ? (
                    <div className="pointer-events-none absolute bottom-full left-1/2 mb-1 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-surface-elevated px-2 py-1 text-[11px] font-medium text-foreground shadow-lg group-hover:block">
                      {BUCKETS[index].label}: {count}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-1 flex gap-2">
        <div className="w-6 shrink-0" />
        <div className="flex flex-1 gap-px">
          {BUCKETS.map((bucket) => (
            <div key={bucket.label} className="flex-1 text-center text-[10px] font-medium text-foreground/50">
              {bucket.label}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function StatCell({ label, value, suffix }: { label: string; value: number | null; suffix?: string }) {
  return (
    <div className="rounded-lg bg-surface-muted/50 px-2 py-1.5">
      <div className="text-[10px] font-medium text-foreground/45">{label}</div>
      <div className="text-xs font-bold tabular-nums text-foreground">
        {value === null ? "–" : `${Math.round(value)}${suffix ?? ""}`}
      </div>
    </div>
  );
}
