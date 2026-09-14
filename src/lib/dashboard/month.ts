import { addDays, isoDate, mondayOf } from "@/lib/dashboard/week";

export type CalendarView = "month" | "week" | "day" | "agenda";

/** Parses `?view=`; anything unknown falls back to the month grid. */
export function parseCalendarView(value: string | undefined): CalendarView {
  return value === "week" || value === "day" || value === "agenda" ? value : "month";
}

/** Parses `?date=YYYY-MM-DD` as the anchor day (defaults to today). */
export function parseAnchor(value: string | undefined, now = new Date()): Date {
  if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day);
  }
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/** Number of days the agenda list spans from the anchor. */
export const AGENDA_DAYS = 14;

/** Inclusive `YYYY-MM-DD` range shown by a view around `anchor`. */
export function rangeFor(view: CalendarView, anchor: Date): { start: string; end: string } {
  if (view === "day") return { start: isoDate(anchor), end: isoDate(anchor) };
  if (view === "week") {
    const monday = mondayOf(anchor);
    return { start: isoDate(monday), end: isoDate(addDays(monday, 4)) };
  }
  if (view === "agenda") {
    return { start: isoDate(anchor), end: isoDate(addDays(anchor, AGENDA_DAYS - 1)) };
  }
  return monthRange(anchor);
}

/** Moves the anchor one step in the current view's unit (±1 day/week/month). */
export function shiftAnchor(view: CalendarView, anchor: Date, direction: number): Date {
  if (view === "day") return addDays(anchor, direction);
  if (view === "week") return addDays(mondayOf(anchor), direction * 7);
  if (view === "agenda") return addDays(anchor, direction * AGENDA_DAYS);
  return addMonths(anchor, direction);
}

/** Every **weekday** (Mon–Fri) from the Monday on/before the month start through
 * the last weekday of the month — a multiple of 5, i.e. whole Mon–Fri rows. */
export function monthCells(date: Date): Date[] {
  const first = firstOfMonth(date);
  const last = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  const cells: Date[] = [];
  const cursor = mondayOf(first);
  while (cursor <= last) {
    if (weekdayIndex(cursor) < 5) cells.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return cells;
}

/** Two dates fall on the same local day. */
export function isSameDay(a: Date, b: Date): boolean {
  return isoDate(a) === isoDate(b);
}

/** Recores/lunch-style timetable math for the time-grid week/day views. */
export const WEEK_START_HOUR = 7;
export const WEEK_END_HOUR = 19;

export function minutesFromMidnight(hhmm: string): number {
  const [hours, minutes] = hhmm.split(":").map(Number);
  return (hours ?? 0) * 60 + (minutes ?? 0);
}

export function timeBlockOffset(
  startTime: string,
  endTime: string,
  startHour: number,
  endHour: number,
  hourHeight: number,
): { top: number; height: number } {
  const start = Math.max(minutesFromMidnight(startTime), startHour * 60);
  const end = Math.min(Math.max(minutesFromMidnight(endTime), start + 15), endHour * 60);
  return {
    top: ((start - startHour * 60) / 60) * hourHeight,
    height: Math.max(((end - start) / 60) * hourHeight, 22),
  };
}

type TimedRange = { startTime?: string | null; endTime?: string | null };

/** Packs overlapping timed items into side-by-side columns for the time grid. */
export function layoutTimedRanges<T extends TimedRange>(
  items: T[],
): { item: T; col: number; colCount: number }[] {
  const prepared = items
    .filter((item) => item.startTime)
    .map((item) => {
      const start = minutesFromMidnight(item.startTime ?? "00:00");
      const rawEnd = minutesFromMidnight(item.endTime ?? item.startTime ?? "00:00");
      return { item, start, end: Math.max(rawEnd, start + 15) };
    })
    .sort((a, b) => a.start - b.start || a.end - b.end);

  const result = prepared.map((entry) => ({ item: entry.item, col: 0, colCount: 1 }));
  const clusters: number[][] = [];
  let current: number[] = [];
  let groupEnd = -1;

  prepared.forEach((entry, index) => {
    if (current.length === 0 || entry.start < groupEnd) {
      current.push(index);
      groupEnd = Math.max(groupEnd, entry.end);
      return;
    }
    clusters.push(current);
    current = [index];
    groupEnd = entry.end;
  });
  if (current.length > 0) clusters.push(current);

  for (const cluster of clusters) {
    const colEnds: number[] = [];
    for (const index of cluster) {
      const entry = prepared[index];
      let col = colEnds.findIndex((end) => end <= entry.start);
      if (col === -1) {
        col = colEnds.length;
        colEnds.push(entry.end);
      } else {
        colEnds[col] = entry.end;
      }
      result[index].col = col;
    }
    const colCount = Math.max(colEnds.length, 1);
    for (const index of cluster) result[index].colCount = colCount;
  }

  return result;
}

/** First day of `date`'s month, local midnight. */
export function firstOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

/** First of the month `months` away (negative for previous). */
export function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

/** Inclusive `YYYY-MM-DD` range covering the whole month. */
export function monthRange(date: Date): { start: string; end: string } {
  const start = firstOfMonth(date);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return { start: isoDate(start), end: isoDate(end) };
}

/** Monday-based weekday index: Monday = 0 … Sunday = 6. */
export function weekdayIndex(date: Date): number {
  return (date.getDay() + 6) % 7;
}

/** Capitalizes the first letter of a localized label ("septiembre" → "Septiembre"). */
export function capitalize(value: string): string {
  return value.charAt(0).toLocaleUpperCase("es-CR") + value.slice(1);
}
