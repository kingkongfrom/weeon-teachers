import { HorariosPageView } from "@/components/schedule/horarios-page-view";
import { loadGroupEventsBetween, loadUpcomingTeacherEvaluations } from "@/lib/dashboard/calendar";
import { loadTeacherSchedule } from "@/lib/dashboard/schedule";
import { addDays, isoDate, mondayOf, parseWeekStart } from "@/lib/dashboard/week";

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

  const [lessons, events, upcomingEvaluations] = await Promise.all([
    loadTeacherSchedule(),
    loadGroupEventsBetween(startISO, endISO),
    loadUpcomingTeacherEvaluations(12),
  ]);

  return (
    <HorariosPageView
      lessons={lessons}
      events={events}
      weekStartISO={startISO}
      isCurrentWeek={startISO === isoDate(mondayOf(new Date()))}
      upcomingEvaluations={upcomingEvaluations}
    />
  );
}