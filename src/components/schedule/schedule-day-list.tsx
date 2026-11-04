"use client";

import { useMemo, useState } from "react";
import {
  WEEKDAYS,
  type TeacherLesson,
  type Weekday,
} from "@/lib/dashboard/schedule-types";
import { isoDate, weekDates } from "@/lib/dashboard/week";
import { useLiveT } from "@/lib/i18n/client";
import { LessonCard } from "@/components/schedule/lesson-card";
import type { TeacherCalendarEvent } from "@/lib/dashboard/calendar-types";

/**
 * Phone view of the weekly timetable.
 *
 * The week board renders one column per weekday, which needs ~200px per day to
 * be readable. A phone cannot show five of those, and stacking all five days
 * vertically (the previous `grid-cols-1`) hid most of the week behind a long
 * scroll with no sense of "today". Same treatment the school ERP uses for its
 * group timetable: one day at a time, chosen from a switcher.
 *
 * Shown below `md`; from `md` up the week board takes over.
 */
export function ScheduleDayList({
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

  const weekdayValues = WEEKDAYS.map((day) => day.value);

  // Open on today when it is a school day, otherwise on the first day that has
  // lessons. Opening on an empty Monday when your classes are Tue/Thu read as
  // "my timetable disappeared" in the ERP — same trap, avoided here.
  const [selected, setSelected] = useState<Weekday>(() => {
    const now = new Date();
    // getDay: 0 = Sunday, so Monday = 1 .. Friday = 5
    const todayIndex = now.getDay() - 1;
    const today = weekdayValues[todayIndex];
    const hasLessons = (day: Weekday) => lessons.some((lesson) => lesson.weekday === day);
    if (today && hasLessons(today)) return today;
    return weekdayValues.find(hasLessons) ?? today ?? weekdayValues[0]!;
  });

  const todayISO = isoDate(new Date());

  const lessonsByDay = useMemo(() => {
    const map = new Map<Weekday, TeacherLesson[]>();
    for (const day of weekdayValues) {
      map.set(
        day,
        lessons
          .filter((lesson) => lesson.weekday === day)
          .sort((a, b) => a.startTime.localeCompare(b.startTime)),
      );
    }
    return map;
  }, [lessons, weekdayValues]);

  const dayLessons = lessonsByDay.get(selected) ?? [];
  const selectedIndex = weekdayValues.indexOf(selected);
  const selectedDate = dates?.[selectedIndex];
  const selectedDateISO = selectedDate ? isoDate(selectedDate) : null;
  const dayEvents = selectedDateISO
    ? events.filter((event) => event.date === selectedDateISO)
    : [];

  return (
    <div className="md:hidden">
      {/* Day switcher. Counts per day so an empty day is visible before tapping. */}
      <div
        role="tablist"
        aria-label={t.horarios.title}
        className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {WEEKDAYS.map((day, index) => {
          const isSelected = day.value === selected;
          const date = dates?.[index];
          const isToday = date ? isoDate(date) === todayISO : false;
          const count = lessonsByDay.get(day.value)?.length ?? 0;
          return (
            <button
              key={day.value}
              type="button"
              role="tab"
              aria-selected={isSelected}
              onClick={() => setSelected(day.value)}
              className={`relative flex min-w-[3.5rem] flex-1 flex-col items-center gap-0.5 rounded-xl px-2 py-2 text-xs font-bold transition-colors ${
                isSelected
                  ? "bg-brand-600 text-white shadow-sm"
                  : "bg-surface text-foreground/60 ring-1 ring-inset ring-black/5 hover:bg-surface-muted dark:ring-white/10"
              }`}
            >
              <span>{t.schedule.weekdays[index]}</span>
              <span
                className={`text-[10px] font-semibold tabular-nums ${
                  isSelected ? "text-white/75" : "text-foreground/40"
                }`}
              >
                {count === 0 ? "—" : count}
              </span>
              {isToday && !isSelected ? (
                <span
                  className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-brand-600"
                  aria-hidden
                />
              ) : null}
            </button>
          );
        })}
      </div>

      {dayEvents.length > 0 ? (
        <ul className="mt-3 flex flex-col gap-1.5">
          {dayEvents.map((event) => (
            <li
              key={event.id}
              className="rounded-lg bg-surface-muted px-3 py-2 text-xs font-semibold text-foreground/70"
            >
              {event.title}
              {!event.allDay && event.startTime ? (
                <span className="ml-1.5 font-medium tabular-nums opacity-70">
                  {event.startTime}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      {dayLessons.length === 0 ? (
        <p className="mt-4 rounded-2xl px-4 py-8 text-center text-sm font-medium text-foreground/50 ring-1 ring-inset ring-black/5 dark:ring-white/10">
          {t.schedule.noClasses}
        </p>
      ) : (
        <div className="mt-3 flex flex-col gap-2">
          {dayLessons.map((lesson) => (
            <LessonCard
              key={lesson.id}
              lesson={lesson}
              dayLabel={t.schedule.weekdays[selectedIndex]}
              events={dayEvents.filter((event) => event.lessonId === lesson.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
