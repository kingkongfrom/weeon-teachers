import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

/** Week pager for the timetable: previous / next / back-to-this-week. */
export function WeekNavigator({
  label,
  prevHref,
  nextHref,
  todayHref,
  todayLabel,
  isCurrentWeek,
}: {
  label: string;
  prevHref: string;
  nextHref: string;
  todayHref: string;
  todayLabel: string;
  isCurrentWeek: boolean;
}) {
  const button =
    "inline-flex h-10 items-center gap-1.5 rounded-xl border border-border bg-surface px-3 text-sm font-semibold text-foreground/70 transition-colors hover:bg-surface-muted";

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <Link href={prevHref} aria-label="Semana anterior" className={button}>
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <Link href={nextHref} aria-label="Semana siguiente" className={button}>
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      <p className="inline-flex items-center gap-2 text-sm font-bold text-foreground">
        <CalendarDays className="h-4 w-4 text-foreground/45" />
        {label}
      </p>

      <Link
        href={todayHref}
        aria-disabled={isCurrentWeek}
        className={`${button} ${isCurrentWeek ? "pointer-events-none opacity-50" : ""}`}
      >
        {todayLabel}
      </Link>
    </div>
  );
}
