import "server-only";

/**
 * School-period label for a report date, following the same academic calendar
 * rules as weeon-tenants. Defaults to the MEP calendar (two periodos lectivos
 * per year); the data covers 2025 and 2026 with the MEP reference pattern.
 *
 * The tenant's configured calendar system is not stored on class_reports, so
 * reports are labeled with the default MEP periodos. If a school uses
 * trimesters/semesters, extend here (see weeon-tenants private-school-calendar).
 */

type Period = { label: string; start: Date; end: Date };

function parseLocalDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** MEP period start/end by academic-year start (e.g. 2026 → año 2026-2027). */
const MEP_DATES: Record<number, [Period, Period]> = {
  2026: [
    { label: "I Periodo 2026", start: parseLocalDate("2026-02-23"), end: parseLocalDate("2026-07-03") },
    { label: "II Periodo 2026", start: parseLocalDate("2026-07-20"), end: parseLocalDate("2026-12-09") },
  ],
  2025: [
    { label: "I Periodo 2025", start: parseLocalDate("2025-02-17"), end: parseLocalDate("2025-07-04") },
    { label: "II Periodo 2025", start: parseLocalDate("2025-07-21"), end: parseLocalDate("2025-12-10") },
  ],
};

function defaultMepSystem(year: number): [Period, Period] {
  return [
    { label: `I Periodo ${year}`, start: parseLocalDate(`${year}-02-23`), end: parseLocalDate(`${year}-07-03`) },
    { label: `II Periodo ${year}`, start: parseLocalDate(`${year}-07-20`), end: parseLocalDate(`${year}-12-09`) },
  ];
}

/** The MEP academic-year start for a date: February..December belong to that year. */
function mepAcademicYearStart(when: Date): number {
  const year = when.getFullYear();
  // If the date is in January, it belongs to the previous academic year.
  return when.getMonth() === 0 ? year - 1 : year;
}

/** Best-effort period label for a date (falls back to the year itself). */
export function schoolPeriodLabel(iso: string): string {
  const when = new Date(iso);
  if (Number.isNaN(when.getTime())) return "";

  const year = mepAcademicYearStart(when);
  const periods = MEP_DATES[year] ?? defaultMepSystem(year);

  // Prefer the period that contains the date.
  const t = when.getTime();
  for (const period of periods) {
    if (t >= period.start.getTime() && t <= period.end.getTime()) return period.label;
  }

  // Between periods (vacaciones) or after the year ends: report the year only
  // if not in a known period. Use the label of the nearest period.
  for (const period of periods) {
    if (t < period.start.getTime()) return `${year}`;
  }

  // After the last period (e.g. mid-December): return the following year's
  // first period label if it belongs to next year, else just the year.
  return `${year}`;
}
