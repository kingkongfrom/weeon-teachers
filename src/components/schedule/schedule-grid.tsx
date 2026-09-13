import {
  WEEKDAYS,
  type TeacherLesson,
  type Weekday,
} from "@/lib/dashboard/schedule";
import { isoDate, weekDates } from "@/lib/dashboard/week";
import { getT } from "@/lib/i18n/server";
import { LessonCard } from "@/components/schedule/lesson-card";
import type { TeacherCalendarEvent } from "@/lib/dashboard/calendar";

/**
 * Weekly timetable: one column per weekday. With `weekStart` the columns carry
 * the real dates and any events/exams for that week; clicking a lesson previews
 * it.
 */
export async function ScheduleGrid({
  lessons,
  weekStart,
  events = [],
}: {
  lessons: TeacherLesson[];
  weekStart?: Date;
  events?: TeacherCalendarEvent[];
}) {
  const t = await getT();
  const dates = weekStart ? weekDates(weekStart) : null;

  const byDay = new Map<Weekday, TeacherLesson[]>();
  for (const day of WEEKDAYS) byDay.set(day.value, []);
  for (const lesson of lessons) {
    byDay.get(lesson.weekday)?.push(lesson);
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
      {WEEKDAYS.map((day, index) => {
        const dayLessons = byDay.get(day.value) ?? [];
        const date = dates?.[index];
        const dateISO = date ? isoDate(date) : null;
        const dayEvents = dateISO ? events.filter((event) => event.date === dateISO) : [];
        return (
          <section
            key={day.value}
            className="flex flex-col gap-3 rounded-2xl bg-surface p-4 ring-1 ring-inset ring-black/5 dark:bg-[#2a3140] dark:ring-white/10"
          >
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="text-sm font-bold uppercase tracking-wide text-foreground/70">
                {t.schedule.weekdays[index]}
              </h3>
              {date ? (
                <span className="text-sm font-bold text-foreground/40">{date.getDate()}</span>
              ) : null}
            </div>

            {dayEvents.length > 0 ? (
              <ul className="flex flex-col gap-1.5">
                {dayEvents.map((event) => (
                  <li
                    key={event.id}
                    className="rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
                  >
                    {event.title}
                    {!event.allDay && event.startTime ? (
                      <span className="ml-1 font-medium opacity-80">{event.startTime}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : null}

            <div className="flex flex-col gap-2">
              {dayLessons.length === 0 ? (
                <p className="px-1 py-2 text-xs font-medium text-foreground/40">
                  {t.schedule.noClasses}
                </p>
              ) : (
                dayLessons.map((lesson) => (
                  <LessonCard
                    key={lesson.id}
                    lesson={lesson}
                    dayLabel={t.schedule.weekdays[index]}
                    dateISO={dateISO ?? undefined}
                    events={dayEvents.filter((event) => event.lessonId === lesson.id)}
                  />
                ))
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
