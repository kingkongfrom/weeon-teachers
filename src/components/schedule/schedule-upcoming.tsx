import Link from "next/link";
import { ArrowUpRight, CalendarDays, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { schoolWeekday } from "@/lib/attendance/model";
import { TONE_CARD, TONE_INK, TONE_INK_FAINT, type Tone } from "@/lib/dashboard/tones";
import type { TeacherLesson, Weekday } from "@/lib/dashboard/schedule";
import { WEEKDAYS } from "@/lib/dashboard/schedule";
import { getLocale, getT } from "@/lib/i18n/server";

const LESSON_TONE: Record<string, Tone> = {
  red: "rose",
  rose: "rose",
  orange: "yellow",
  amber: "yellow",
  lime: "green",
  green: "green",
  cyan: "green",
  teal: "green",
  blue: "blue",
  indigo: "purple",
  violet: "purple",
  purple: "purple",
  fuchsia: "purple",
  pink: "rose",
};

const WEEKDAY_ORDER: Record<Weekday, number> = {
  mon: 0,
  tue: 1,
  wed: 2,
  thu: 3,
  fri: 4,
};

function timeLabel(hhmm: string): string {
  const [hours, minutes] = hhmm.split(":");
  if (!hours || !minutes) return hhmm;
  return `${Number(hours)}:${minutes}`;
}

function sortLessons(lessons: TeacherLesson[]): TeacherLesson[] {
  return [...lessons].sort((a, b) => {
    const dayDiff = WEEKDAY_ORDER[a.weekday] - WEEKDAY_ORDER[b.weekday];
    if (dayDiff !== 0) return dayDiff;
    return a.startTime.localeCompare(b.startTime);
  });
}

function isSchoolWeekday(value: string): value is Weekday {
  return WEEKDAYS.some((day) => day.value === value);
}

type ScheduleUpcomingProps = {
  lessons: TeacherLesson[];
  className?: string;
};

/** Compact today + next classes for Panel general — full week lives on /horarios. */
export async function ScheduleUpcoming({ lessons, className }: ScheduleUpcomingProps) {
  const [t, locale] = await Promise.all([getT(), getLocale()]);
  const todayKey = schoolWeekday();
  const isWeekend = todayKey === "sat" || todayKey === "sun";
  const todayWeekday = isSchoolWeekday(todayKey) ? todayKey : null;
  const todayIndex = todayWeekday ? WEEKDAY_ORDER[todayWeekday] : -1;

  const sorted = sortLessons(lessons);
  const todayLessons = todayWeekday
    ? sorted.filter((lesson) => lesson.weekday === todayWeekday)
    : [];
  const upcomingLessons = sorted
    .filter((lesson) => WEEKDAY_ORDER[lesson.weekday] > todayIndex)
    .slice(0, 3);

  const todayLabel = new Intl.DateTimeFormat(locale === "en" ? "en-US" : "es-CR", {
    timeZone: "America/Costa_Rica",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());

  function weekdayLabel(weekday: Weekday): string {
    const index = WEEKDAY_ORDER[weekday];
    return t.schedule.weekdays[index] ?? weekday;
  }

  function LessonRow({
    lesson,
    showDay = false,
  }: {
    lesson: TeacherLesson;
    showDay?: boolean;
  }) {
    const tone = TONE_CARD[LESSON_TONE[lesson.color] ?? "blue"];

    return (
      <Link
        href={`/aula-virtual/${lesson.classId}`}
        className={cn(
          "flex items-center gap-3 rounded-xl p-3 ring-1 ring-inset ring-black/5 transition-all hover:brightness-[0.96] active:scale-[0.99] dark:ring-white/10 dark:hover:brightness-110",
          tone,
          TONE_INK,
        )}
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{lesson.title}</p>
          <p className={cn("truncate text-xs font-medium", TONE_INK_FAINT)}>
            {lesson.groupName}
            {lesson.room ? ` · ${lesson.room}` : ""}
          </p>
        </div>
        <div className={cn("shrink-0 text-right text-xs font-semibold", TONE_INK_FAINT)}>
          {showDay ? (
            <span className="block capitalize">{weekdayLabel(lesson.weekday)}</span>
          ) : null}
          <span className="tabular-nums">
            {timeLabel(lesson.startTime)}–{timeLabel(lesson.endTime)}
          </span>
        </div>
      </Link>
    );
  }

  return (
    <section
      className={cn(
        "flex h-full flex-col gap-4 rounded-2xl border border-border bg-surface p-5 sm:gap-5 sm:p-6",
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2 className="brand-page-title text-lg text-foreground">{t.panel.todayTitle}</h2>
          <p className="text-sm font-medium capitalize text-foreground/55">{todayLabel}</p>
        </div>
        <Link
          href="/horarios"
          className="inline-flex shrink-0 items-center gap-1 rounded-full bg-surface-muted px-3 py-1.5 text-xs font-semibold text-foreground/70 ring-1 ring-border transition-colors hover:text-foreground"
        >
          {t.panel.viewFullSchedule}
          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </div>

      {lessons.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center">
          <p className="text-sm font-medium text-foreground/60">{t.panel.noLessons}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {isWeekend ? (
            <p className="flex items-center gap-2 text-sm font-medium text-foreground/60">
              <CalendarDays className="h-4 w-4 shrink-0 text-foreground/40" aria-hidden />
              {t.panel.weekendEmpty}
            </p>
          ) : todayLessons.length === 0 ? (
            <p className="flex items-center gap-2 text-sm font-medium text-foreground/60">
              <Clock className="h-4 w-4 shrink-0 text-foreground/40" aria-hidden />
              {t.panel.todayEmpty}
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {todayLessons.map((lesson) => (
                <li key={lesson.id}>
                  <LessonRow lesson={lesson} />
                </li>
              ))}
            </ul>
          )}

          {upcomingLessons.length > 0 ? (
            <div className="flex flex-col gap-2 border-t border-border pt-4">
              <h3 className="text-xs font-bold uppercase tracking-wide text-foreground/45">
                {t.panel.upcomingTitle}
              </h3>
              <ul className="flex flex-col gap-2">
                {upcomingLessons.map((lesson) => (
                  <li key={lesson.id}>
                    <LessonRow lesson={lesson} showDay />
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
