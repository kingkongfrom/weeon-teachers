import {
  WEEKDAYS,
  type TeacherLesson,
  type Weekday,
} from "@/lib/dashboard/schedule";
import { isoDate, weekDates } from "@/lib/dashboard/week";
import { getT } from "@/lib/i18n/server";
import { LessonCard } from "@/components/schedule/lesson-card";
import { cn } from "@/lib/utils";
import type { TeacherCalendarEvent } from "@/lib/dashboard/calendar";

/**
 * Weekly timetable: Mon–Fri columns inside the horarios board. With `weekStart`,
 * columns show real dates, today is highlighted, and group events sit above lessons.
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
  const todayISO = isoDate(new Date());

  const byDay = new Map<Weekday, TeacherLesson[]>();
  for (const day of WEEKDAYS) byDay.set(day.value, []);
  for (const lesson of lessons) {
    byDay.get(lesson.weekday)?.push(lesson);
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 xl:divide-x xl:divide-border">
      {WEEKDAYS.map((day, index) => {
        const dayLessons = byDay.get(day.value) ?? [];
        const date = dates?.[index];
        const dateISO = date ? isoDate(date) : null;
        const isToday = dateISO === todayISO;
        const dayEvents = dateISO ? events.filter((event) => event.date === dateISO) : [];

        return (
          <section
            key={day.value}
            className={cn(
              "flex min-h-[8rem] flex-col gap-2 border-b border-border p-4 last:border-b-0 xl:border-b-0",
              isToday && "bg-brand-50/50 dark:bg-brand-950/25",
            )}
          >
            <div
              className={cn(
                "flex items-center justify-between gap-2 rounded-lg px-2 py-2",
                isToday
                  ? "bg-brand-100/80 dark:bg-brand-950/40"
                  : "bg-brand-50/70 dark:bg-brand-950/30",
              )}
            >
              <p className="text-[11px] font-bold uppercase tracking-wider text-brand-700/85 dark:text-brand-300/90">
                {t.schedule.weekdays[index]}
              </p>
              {date ? (
                <span
                  className={cn(
                    "flex h-7 min-w-7 items-center justify-center rounded-lg text-sm font-bold tabular-nums",
                    isToday ? "brand-gradient text-white shadow-sm" : "text-foreground/45",
                  )}
                >
                  {date.getDate()}
                </span>
              ) : null}
            </div>

            {dayEvents.length > 0 ? (
              <ul className="flex flex-col gap-1.5">
                {dayEvents.map((event) => (
                  <li
                    key={event.id}
                    className="rounded-lg border border-amber-200/80 bg-amber-50/90 px-2.5 py-1.5 text-xs font-semibold text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/35 dark:text-amber-100"
                  >
                    {event.title}
                    {!event.allDay && event.startTime ? (
                      <span className="ml-1 font-medium opacity-75">{event.startTime}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : null}

            <div className="flex flex-1 flex-col gap-2">
              {dayLessons.length === 0 ? (
                <p className="px-1 py-3 text-center text-xs font-medium text-foreground/40">
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
                    emphasize={isToday}
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
