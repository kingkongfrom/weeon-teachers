"use client";

import {
  WEEKDAYS,
  type TeacherLesson,
  type Weekday,
} from "@/lib/dashboard/schedule-types";
import { isoDate, weekDates } from "@/lib/dashboard/week";
import { useLiveT } from "@/lib/i18n/client";
import { LessonCard } from "@/components/schedule/lesson-card";
import { hubTonePill, eventHubChip, type Tone } from "@/lib/dashboard/tones";
import { cn } from "@/lib/utils";
import type { TeacherCalendarEvent } from "@/lib/dashboard/calendar-types";

/**
 * Weekly timetable: one column per weekday. With `weekStart` the columns carry
 * the real dates and any events/exams for that week; clicking a lesson previews
 * it.
 */
export function ScheduleGrid({
  lessons,
  weekStart,
  events = [],
}: {
  lessons: TeacherLesson[];
  weekStart?: Date;
  events?: TeacherCalendarEvent[];
}) {
  const t = useLiveT();
  const dates = weekStart ? weekDates(weekStart) : null;
  const todayISO = isoDate(new Date());
  const dayTones: Tone[] = ["blue", "purple", "yellow", "green", "rose"];

  const byDay = new Map<Weekday, TeacherLesson[]>();
  for (const day of WEEKDAYS) byDay.set(day.value, []);
  for (const lesson of lessons) {
    byDay.get(lesson.weekday)?.push(lesson);
  }

  return (
    /*
     * Week board for the widths that can hold five readable day columns:
     * landscape tablets and desktops. Hidden on phones (below 768) and on
     * tablets in portrait, which get ScheduleDayList instead — five columns at
     * ~140px in an upright iPad are cramped once the day header and cards are
     * in, and the owner asked for the same phone treatment there.
     *
     * Composed from two single-condition variants: @custom-variant takes one
     * media condition, so a comma-separated list would emit an invalid selector
     * and fail the build.
     */
    <div className="hidden grid-cols-5 gap-4 tablet-landscape:grid lg:grid">
      {WEEKDAYS.map((day, index) => {
        const dayLessons = byDay.get(day.value) ?? [];
        const date = dates?.[index];
        const dateISO = date ? isoDate(date) : null;
        const dayEvents = dateISO ? events.filter((event) => event.date === dateISO) : [];
        const isToday = dateISO === todayISO;
        const dayPill = hubTonePill(dayTones[index] ?? "blue");
        return (
          <section
            key={day.value}
            className={cn(
              "flex flex-col gap-3 rounded-2xl bg-surface p-4 ring-1 ring-inset ring-black/5 dark:ring-white/10",
              isToday && "bg-brand-50/25 ring-brand-400/25 dark:bg-brand-950/15 dark:ring-brand-500/20",
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <h3
                  className={cn(
                    "rounded-lg px-2 py-1 text-sm font-bold uppercase tracking-wide",
                    dayPill.wash,
                    dayPill.label,
                  )}
                >
                  {t.schedule.weekdays[index]}
                </h3>
                {isToday ? (
                  <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-brand-600/80 dark:text-brand-400/90">
                    {t.schedule.today}
                  </span>
                ) : null}
              </div>
              {date ? (
                <span
                  className={cn(
                    "text-sm font-bold tabular-nums",
                    isToday ? "text-brand-700 dark:text-brand-300" : "text-foreground/40",
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
                    className={cn("rounded-lg px-2.5 py-1.5 text-xs font-semibold", eventHubChip(event.eventType))}
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
