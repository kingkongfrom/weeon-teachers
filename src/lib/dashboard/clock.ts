import { ATTENDANCE_TIME_ZONE } from "@/lib/attendance/model";

/** School-local clock string (Costa Rica), 12h with seconds. Server + client. */
export function schoolClock(now: Date, locale: "es" | "en"): string {
  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "es-CR", {
    timeZone: ATTENDANCE_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(now);
}
