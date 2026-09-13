import type { Weekday } from "@/lib/dashboard/schedule";

/** Monday at local midnight for `date`. */
export function mondayOf(date: Date): Date {
  const copy = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = copy.getDay();
  copy.setDate(copy.getDate() + (day === 0 ? -6 : 1 - day));
  return copy;
}

/** Parses `?week=YYYY-MM-DD` (any day of the week) into that week's Monday. */
export function parseWeekStart(value: string | undefined, now = new Date()): Date {
  if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    return mondayOf(new Date(year, month - 1, day));
  }
  return mondayOf(now);
}

export function addDays(date: Date, days: number): Date {
  const copy = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  copy.setDate(copy.getDate() + days);
  return copy;
}

export function isoDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/** Monday–Friday dates of the week starting at `monday`. */
export function weekDates(monday: Date): Date[] {
  return [0, 1, 2, 3, 4].map((offset) => addDays(monday, offset));
}

const DAY_KEYS: Weekday[] = ["mon", "tue", "wed", "thu", "fri"];

/** Timetable weekday for a date (Monday–Friday). */
export function weekdayOf(date: Date): Weekday {
  const day = date.getDay();
  return DAY_KEYS[Math.max(0, Math.min(4, day - 1))] ?? "mon";
}

/** "7 – 11 sep 2026" */
export function weekRangeLabel(monday: Date, locale = "es-CR"): string {
  const end = addDays(monday, 4);
  const startLabel = monday.toLocaleDateString(locale, { day: "numeric" });
  const endLabel = end.toLocaleDateString(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return `${startLabel} – ${endLabel}`;
}
