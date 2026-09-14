/**
 * School-local time helpers. `calendar_events.date` is a plain date, but
 * `assessments.due_at` is a `timestamptz`; rendering it in the teacher's
 * civil time (Costa Rica, UTC-6, no DST) keeps a late-evening due date on the
 * right calendar day regardless of the server's timezone.
 */
const SCHOOL_TIME_ZONE = "America/Costa_Rica";

/** Splits an ISO timestamp into the school-local `YYYY-MM-DD` and `HH:MM`. */
export function zonedDateParts(iso: string): { date: string; time: string } | null {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return null;

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: SCHOOL_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(parsed);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  const hour = get("hour") === "24" ? "00" : get("hour");
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    time: `${hour}:${get("minute")}`,
  };
}
