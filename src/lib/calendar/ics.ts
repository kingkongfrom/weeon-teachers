const CRLF = "\r\n";

function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

function foldLine(line: string): string {
  if (line.length <= 75) return line;
  const parts: string[] = [];
  let rest = line;
  parts.push(rest.slice(0, 75));
  rest = rest.slice(75);
  while (rest.length > 0) {
    parts.push(` ${rest.slice(0, 74)}`);
    rest = rest.slice(74);
  }
  return parts.join(CRLF);
}

function formatUtcStamp(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
  );
}

function addDaysIso(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

export type IcsEventInput = {
  uid: string;
  title: string;
  description: string | null;
  location: string | null;
  date: string;
  endDate: string | null;
  allDay: boolean;
  startTime: string | null;
  endTime: string | null;
};

function timedLocalStamp(isoDate: string, hhmm: string): string {
  const [h, min] = hhmm.split(":");
  return `${isoDate.replace(/-/g, "")}T${h}${min}00`;
}

export function buildInstitutionCalendarIcs(options: {
  calName: string;
  events: IcsEventInput[];
  refreshHours?: number;
}): string {
  const now = new Date();
  const stamp = formatUtcStamp(now);
  const refresh = options.refreshHours ?? 6;

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Weeon School//Institution Calendar//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeIcsText(options.calName)}`,
    `X-PUBLISHED-TTL:PT${refresh}H`,
    "BEGIN:VTIMEZONE",
    "TZID:America/Costa_Rica",
    "BEGIN:STANDARD",
    "TZOFFSETFROM:-0600",
    "TZOFFSETTO:-0600",
    "TZNAME:CST",
    "DTSTART:19700101T000000",
    "END:STANDARD",
    "END:VTIMEZONE",
  ];

  for (const event of options.events) {
    const endDay = event.endDate && event.endDate >= event.date ? event.endDate : event.date;
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${event.uid}`);
    lines.push(`DTSTAMP:${stamp}`);
    lines.push(`SUMMARY:${escapeIcsText(event.title)}`);
    if (event.description?.trim()) {
      lines.push(`DESCRIPTION:${escapeIcsText(event.description.trim())}`);
    }
    if (event.location?.trim()) {
      lines.push(`LOCATION:${escapeIcsText(event.location.trim())}`);
    }
    if (event.allDay || !event.startTime) {
      lines.push(`DTSTART;VALUE=DATE:${event.date.replace(/-/g, "")}`);
      lines.push(`DTEND;VALUE=DATE:${addDaysIso(endDay, 1).replace(/-/g, "")}`);
    } else {
      const start = timedLocalStamp(event.date, event.startTime);
      const endTime =
        event.endTime && event.endTime > event.startTime
          ? event.endTime
          : event.startTime;
      const endDateForTimed = endTime >= event.startTime ? event.date : addDaysIso(event.date, 1);
      const end = timedLocalStamp(endDateForTimed, endTime);
      lines.push(`DTSTART;TZID=America/Costa_Rica:${start}`);
      lines.push(`DTEND;TZID=America/Costa_Rica:${end}`);
    }
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.map(foldLine).join(CRLF) + CRLF;
}
