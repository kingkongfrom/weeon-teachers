import { PageHeader } from "@/components/layout/page-header";
import { CalendarView } from "@/components/agenda/calendar-view";
import { loadEventsBetween, loadExamDueBetween } from "@/lib/dashboard/calendar";
import { parseAnchor, parseCalendarView, rangeFor } from "@/lib/dashboard/month";
import { isoDate } from "@/lib/dashboard/week";
import { getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

/**
 * Teacher calendar with month / week / day / agenda views. Aggregates the
 * institution events with the teacher's aula virtual exams, driven by `?view=`
 * and `?date=`. Read-only — the institution publishes events and exams are
 * authored in the aula virtual.
 */
export default async function CalendarioPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; date?: string }>;
}) {
  const { view: viewParam, date: dateParam } = await searchParams;
  const t = await getT();
  const view = parseCalendarView(viewParam);
  const anchor = parseAnchor(dateParam);
  const { start, end } = rangeFor(view, anchor);
  const [events, exams] = await Promise.all([
    loadEventsBetween(start, end),
    loadExamDueBetween(start, end),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t.agenda.calendario.label}
        description={t.agenda.calendario.description}
        backHref="/agenda"
      />
      <CalendarView
        key={`${view}-${isoDate(anchor)}`}
        view={view}
        anchorISO={isoDate(anchor)}
        todayISO={isoDate(new Date())}
        events={events}
        exams={exams}
      />
    </div>
  );
}
