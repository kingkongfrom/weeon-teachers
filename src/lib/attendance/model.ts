/**
 * Attendance model shared by server and client. "Today" is always resolved in
 * the school's timezone (Costa Rica) so a late-afternoon register never rolls to
 * tomorrow. Status codes are language-independent; labels live in the i18n
 * catalog.
 */

export const ATTENDANCE_TIME_ZONE = "America/Costa_Rica";

export const ATTENDANCE_STATUS_LIST = [
  "present",
  "late_justified",
  "late_unjustified",
  "absence_justified",
  "absence_unjustified",
] as const;

export type AttendanceStatus = (typeof ATTENDANCE_STATUS_LIST)[number];

export function isAttendanceStatus(value: string): value is AttendanceStatus {
  return (ATTENDANCE_STATUS_LIST as readonly string[]).includes(value);
}

/** Maps the legacy mobile bootstrap values onto the MEP states. */
export function normalizeAttendanceStatus(value: string): AttendanceStatus | null {
  if (isAttendanceStatus(value)) return value;
  if (value === "late") return "late_unjustified";
  if (value === "absent") return "absence_unjustified";
  return null;
}

/** Short MEP codes shown on the segmented control (language-independent). */
export const ATTENDANCE_CODE: Record<AttendanceStatus, string> = {
  present: "P",
  late_justified: "TJ",
  late_unjustified: "TI",
  absence_justified: "AJ",
  absence_unjustified: "A",
};

/** Grouping used by the summary chips. */
export type AttendanceCounts = Record<AttendanceStatus, number>;

export function emptyAttendanceCounts(): AttendanceCounts {
  return {
    present: 0,
    late_justified: 0,
    late_unjustified: 0,
    absence_justified: 0,
    absence_unjustified: 0,
  };
}

export type AttendanceKind = "present" | "late" | "absence";

export const ATTENDANCE_KIND: Record<AttendanceStatus, AttendanceKind> = {
  present: "present",
  late_justified: "late",
  late_unjustified: "late",
  absence_justified: "absence",
  absence_unjustified: "absence",
};

export type SchoolWeekday = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

const WEEKDAY_BY_EN: Record<string, SchoolWeekday> = {
  Mon: "mon",
  Tue: "tue",
  Wed: "wed",
  Thu: "thu",
  Fri: "fri",
  Sat: "sat",
  Sun: "sun",
};

/** Calendar date (YYYY-MM-DD) in the school's timezone. */
export function schoolToday(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: ATTENDANCE_TIME_ZONE }).format(date);
}

/** Weekday in the school's timezone, matching `class_lessons.weekday`. */
export function schoolWeekday(date: Date = new Date()): SchoolWeekday {
  const short = new Intl.DateTimeFormat("en-US", {
    timeZone: ATTENDANCE_TIME_ZONE,
    weekday: "short",
  }).format(date);
  return WEEKDAY_BY_EN[short] ?? "mon";
}

export function normalizeAttendanceDate(value: string | null | undefined): string {
  if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  return schoolToday();
}

/** Shifts a YYYY-MM-DD date by whole days (no timezone drift). */
export function shiftDate(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, (month ?? 1) - 1, (day ?? 1) + days));
  return shifted.toISOString().slice(0, 10);
}
