import { PageHeader } from "@/components/layout/page-header";
import { EventsManager } from "@/components/agenda/events-manager";
import { loadMyCalendarEvents } from "@/lib/dashboard/calendar";
import { loadTeacherSchedule } from "@/lib/dashboard/schedule";
import { toLessonChoices } from "@/lib/agenda/lesson-choice";
import { getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

/** Events & exams: create group events that students see as upcoming events. */
export default async function EventosPage() {
  const t = await getT();
  const [events, schedule] = await Promise.all([loadMyCalendarEvents(), loadTeacherSchedule()]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t.agenda.events.title}
        description={t.agenda.events.description}
        backHref="/agenda"
      />

      <EventsManager events={events} lessons={toLessonChoices(schedule)} />
    </div>
  );
}
