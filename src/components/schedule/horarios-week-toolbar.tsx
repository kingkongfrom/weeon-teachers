import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** Week controls for `/horarios`, aligned with the Calendario toolbar. */
export function HorariosWeekToolbar({
  label,
  prevHref,
  nextHref,
  todayHref,
  todayLabel,
  isCurrentWeek,
  weekStatsLabel,
  viewCalendarLabel,
  calendarioHref,
}: {
  label: string;
  prevHref: string;
  nextHref: string;
  todayHref: string;
  todayLabel: string;
  isCurrentWeek: boolean;
  weekStatsLabel: string;
  viewCalendarLabel: string;
  calendarioHref: string;
}) {
  const iconBtn =
    "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface text-foreground/70 transition-colors hover:bg-surface-muted";

  return (
    <div className="flex flex-col gap-3 border-b border-border p-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:px-4">
      <div className="flex flex-wrap items-center gap-2">
        <Link href={prevHref} aria-label="Semana anterior" className={iconBtn}>
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <Link
          href={todayHref}
          aria-disabled={isCurrentWeek}
          className={cn(
            "h-9 rounded-lg border border-border bg-surface px-3 text-xs font-semibold text-foreground transition-colors hover:bg-surface-muted",
            isCurrentWeek && "pointer-events-none opacity-50",
          )}
        >
          {todayLabel}
        </Link>
        <Link href={nextHref} aria-label="Semana siguiente" className={iconBtn}>
          <ChevronRight className="h-4 w-4" />
        </Link>
        <h2 className="ml-1 text-base font-bold capitalize text-brand-700 sm:text-lg dark:text-brand-300">
          {label}
        </h2>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-800 dark:bg-brand-950/50 dark:text-brand-200">
          {weekStatsLabel}
        </span>
        <Link
          href={calendarioHref}
          className={cn(
            "inline-flex h-9 items-center gap-1.5 rounded-lg border border-brand-200/80 bg-brand-50/60 px-3",
            "text-xs font-semibold text-brand-800 transition-colors hover:bg-brand-100/80",
            "dark:border-brand-800/50 dark:bg-brand-950/40 dark:text-brand-200 dark:hover:bg-brand-950/60",
          )}
        >
          <CalendarDays className="h-3.5 w-3.5" aria-hidden />
          {viewCalendarLabel}
        </Link>
      </div>
    </div>
  );
}
