"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/client";
import { PASS_MARK, tonePillClass } from "@/components/grades/score-cells";
import type { ClassStats } from "@/lib/dashboard/scoreboard";

type StudentCard = {
  id: string;
  name: string;
  /** Final grade 0–100, or null when nothing is graded yet. */
  final: number | null;
  /** Per-rubro grades, already in display order. */
  rubros: { key: string; name: string; peso: number | null; percent: number | null }[];
  /** `true` when the student can no longer pass; `null` when still possible or final. */
  atRisk: boolean;
  /** Grade needed on what is left, when below the pass mark but reachable. */
  needed: number | null;
};

/**
 * Phone layout for the scoreboard. The matrix needs horizontal scrolling to
 * stay honest about points; a director checking grades on a phone wants the
 * answer per student, so this is a card list: name, final, risk, and one thin
 * bar per rubro.
 *
 * Cards, not a squeezed table: 44 px touch targets, no horizontal scroll, no
 * sticky offsets, and the numbers keep their printed meaning.
 */
export function ScoreboardStudentList({
  students,
  stats,
  hrefFor,
  onGrade,
}: {
  students: StudentCard[];
  stats: Pick<ClassStats, "average" | "median" | "graded" | "total">;
  hrefFor: (studentId: string) => string;
  /** Opens the phone grading sheet for that student. */
  onGrade: (studentId: string) => void;
}) {
  const t = useT();
  const s = t.gradebook.workspace.scoreboard;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-xl border border-border bg-surface px-3 py-2 text-xs">
        <span className="font-bold uppercase tracking-[0.1em] text-foreground/45">
          {s.finalAverage}
        </span>
        <span className={cn("text-lg font-bold tabular-nums", toneClass(stats.average))}>
          {stats.average == null ? "—" : `${stats.average}%`}
        </span>
        <span className="text-foreground/40">·</span>
        <span className="font-semibold text-foreground/55">
          {s.medianLabel(stats.median)}
        </span>
        <span className="text-foreground/40">·</span>
        <span className="font-medium text-foreground/45">
          {s.gradedOf(stats.graded, stats.total)}
        </span>
      </div>

      <ul className="flex flex-col gap-2">
        {students.map((student) => (
          <li key={student.id}>
            {/*
             * The card itself grades: that is what a teacher reaches for on a
             * phone. The transcript stays one tap away on the small arrow, so
             * nothing that existed before was removed.
             */}
            <div className="flex flex-col gap-2 rounded-2xl border border-border bg-surface px-3.5 py-3">
              <div className="flex items-center gap-2">
                <button
                    type="button"
                    onClick={() => onGrade(student.id)}
                    className="-mx-1 flex min-w-0 flex-1 items-center gap-2 rounded-lg px-1 py-1 text-left active:bg-surface-muted"
                  >
                  <span className="min-w-0 flex-1 truncate text-[15px] font-semibold text-foreground">
                    {student.name}
                  </span>
                  {student.atRisk ? (
                    <span className="shrink-0 rounded-full bg-error/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-error">
                      {s.atRisk}
                    </span>
                  ) : student.needed != null ? (
                    // "Needs 87 %" is meaningless beside "67 %" without a label,
                    // so the number carries its explanation.
                    <span
                      title={s.atRiskHint(student.needed)}
                      className="shrink-0 rounded-full bg-[#fdeecd] px-2 py-0.5 text-[10px] font-bold tabular-nums text-[#92400e] dark:bg-[#3a2a12] dark:text-[#fde68a]"
                    >
                      {s.needs(student.needed)}
                    </span>
                  ) : null}
                  <span
                    className={cn(
                      "shrink-0 rounded-lg px-2 py-1 text-base font-bold leading-none tabular-nums",
                      student.final == null ? "text-foreground/30" : tonePillClass(student.final),
                    )}
                  >
                    {student.final == null ? "—" : `${student.final}%`}
                  </span>
                </button>
                <Link
                  href={hrefFor(student.id)}
                  aria-label={s.openTranscript(student.name)}
                  title={s.openTranscript(student.name)}
                  // Sits inside the button's flow but is its own target; the
                  // negative margin keeps the tap area from stealing the row.
                  className="-my-2 -mr-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-foreground/30 active:bg-surface-muted"
                >
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>

              {student.rubros.length > 0 ? (
                <div className="flex flex-col gap-1">
                  {student.rubros.map((rubro) => (
                    <div key={rubro.key} className="flex items-center gap-2">
                      <span className="w-20 shrink-0 truncate text-[11px] font-semibold uppercase tracking-wide text-foreground/45">
                        {rubro.name}
                      </span>
                      <span className="relative h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-foreground/10">
                        <span
                          className={cn("absolute inset-y-0 left-0 rounded-full", barTone(rubro.percent))}
                          style={{ width: `${Math.max(0, Math.min(100, rubro.percent ?? 0))}%` }}
                        />
                      </span>
                      <span className="w-9 shrink-0 text-right text-[11px] font-bold tabular-nums text-foreground/60">
                        {rubro.percent == null ? "—" : `${Math.round(rubro.percent)}%`}
                      </span>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </li>
        ))}
      </ul>

      <p className="px-1 text-[11px] font-medium text-foreground/40">
        {s.legend} · {s.passMark(PASS_MARK)}
      </p>
    </div>
  );
}

function toneClass(value: number | null): string {
  if (value == null) return "text-foreground/40";
  if (value >= PASS_MARK) return "text-[#0f766e] dark:text-[#6ee7d7]";
  if (value >= 50) return "text-[#92400e] dark:text-[#fde68a]";
  return "text-[#9f1239] dark:text-[#fda4af]";
}

function barTone(value: number | null): string {
  if (value == null) return "bg-foreground/20";
  if (value >= PASS_MARK) return "bg-[#7dd3c7] dark:bg-[#2dd4bf]";
  if (value >= 50) return "bg-[#f5d88a] dark:bg-[#fbbf24]";
  return "bg-[#f0b8c8] dark:bg-[#fb7185]";
}

