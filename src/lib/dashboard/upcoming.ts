import type { TeacherLesson, Weekday } from "@/lib/dashboard/schedule";

/** JS `getDay()` index for each timetable weekday (Mon–Fri). */
const WEEKDAY_INDEX: Record<Weekday, number> = {
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
};

export type UpcomingLesson = {
  lesson: TeacherLesson;
  /** Next occurrence of the weekly slot from the reference date. */
  date: Date;
};

function parseTime(value: string): { hours: number; minutes: number } {
  const [hours, minutes] = value.split(":").map((part) => Number(part));
  return {
    hours: Number.isFinite(hours) ? hours : 0,
    minutes: Number.isFinite(minutes) ? minutes : 0,
  };
}

/** Next datetime this weekly slot occurs on or after `now`. */
export function nextOccurrence(lesson: TeacherLesson, now = new Date()): Date {
  const target = WEEKDAY_INDEX[lesson.weekday];
  const { hours, minutes } = parseTime(lesson.startTime);
  const candidate = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    hours,
    minutes,
    0,
    0,
  );

  let delta = (target - candidate.getDay() + 7) % 7;
  if (delta === 0 && candidate.getTime() <= now.getTime()) {
    delta = 7;
  }
  candidate.setDate(candidate.getDate() + delta);
  return candidate;
}

/** The teacher's next classes, soonest first. */
export function upcomingLessons(
  lessons: TeacherLesson[],
  now = new Date(),
  limit = 5,
): UpcomingLesson[] {
  return lessons
    .map((lesson) => ({ lesson, date: nextOccurrence(lesson, now) }))
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, limit);
}

/** Lessons that fall on the reference day, by start time. */
export function todaysLessons(lessons: TeacherLesson[], now = new Date()): TeacherLesson[] {
  const day = now.getDay();
  return lessons
    .filter((lesson) => WEEKDAY_INDEX[lesson.weekday] === day)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
}

/** "Hoy" / "Mañana" / weekday name for a future date. */
export function relativeDayLabel(date: Date, now = new Date()): string {
  const startOf = (value: Date) =>
    new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
  const days = Math.round((startOf(date) - startOf(now)) / 86_400_000);
  if (days <= 0) return "Hoy";
  if (days === 1) return "Mañana";
  return date.toLocaleDateString("es-CR", { weekday: "long" });
}
