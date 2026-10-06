import { CalendarDays } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { ScheduleGrid } from "@/components/schedule/schedule-grid";
import { WeekNavigator } from "@/components/schedule/week-navigator";
import { loadGroupEventsBetween } from "@/lib/dashboard/calendar";
import { loadTeacherSchedule } from "@/lib/dashboard/schedule";
import {
  addDays,
  isoDate,
  mondayOf,
  parseWeekStart,
  weekRangeLabel,
} from "@/lib/dashboard/week";
import { getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

/**
 * Weekly timetable with week navigation, so a teacher can page through the
 * whole semester. Group events/exams for the selected week render on their day.
 */
export default async function HorariosPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const { week } = await searchParams;
  const weekStart = parseWeekStart(week);
  const startISO = isoDate(weekStart);
  const endISO = isoDate(addDays(weekStart, 4));

  const [lessons, events, t] = await Promise.all([
    loadTeacherSchedule(),
    loadGroupEventsBetween(startISO, endISO),
    getT(),
  ]);

  const isCurrentWeek = isoDate(weekStart) === isoDate(mondayOf(new Date()));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t.horarios.title}
        description={t.horarios.description}
        backHref="/agenda"
      />

      <WeekNavigator
        label={weekRangeLabel(weekStart)}
        prevHref={`/horarios?week=${isoDate(addDays(weekStart, -7))}`}
        nextHref={`/horarios?week=${isoDate(addDays(weekStart, 7))}`}
        todayHref="/horarios"
        todayLabel={t.schedule.thisWeek}
        isCurrentWeek={isCurrentWeek}
      />

      {lessons.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface px-6 py-16 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950/40 dark:text-brand-300">
            <CalendarDays className="h-6 w-6" strokeWidth={2.2} />
          </div>
          <p className="text-sm font-medium text-foreground/60">{t.panel.noLessons}</p>
        </div>
      ) : (
        <ScheduleGrid lessons={lessons} weekStart={weekStart} events={events} />
      )}
    </div>
  );
}
