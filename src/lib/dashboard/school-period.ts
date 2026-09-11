import "server-only";
import type { Locale } from "@/lib/i18n/config";

/**
 * School-period label for a report date, following the same academic calendar
 * rules as weeon-tenants. Defaults to the MEP calendar (two periodos lectivos
 * per year); the data covers 2025 and 2026 with the MEP reference pattern.
 *
 * The tenant's configured calendar system is not stored on class_reports, so
 * reports are labeled with the default MEP periodos. If a school uses
 * trimesters/semesters, extend here (see weeon-tenants private-school-calendar).
 */

type Period = { term: string; start: Date; end: Date };

function parseLocalDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** MEP period start/end by academic-year start (e.g. 2026 → año 2026-2027). */
const MEP_DATES: Record<number, [Period, Period]> = {
  2026: [
    { term: "I", start: parseLocalDate("2026-02-23"), end: parseLocalDate("2026-07-03") },
    { term: "II", start: parseLocalDate("2026-07-20"), end: parseLocalDate("2026-12-09") },
  ],
  2025: [
    { term: "I", start: parseLocalDate("2025-02-17"), end: parseLocalDate("2025-07-04") },
    { term: "II", start: parseLocalDate("2025-07-21"), end: parseLocalDate("2025-12-10") },
  ],
};

function defaultMepSystem(year: number): [Period, Period] {
  return [
    { term: "I", start: parseLocalDate(`${year}-02-23`), end: parseLocalDate(`${year}-07-03`) },
    { term: "II", start: parseLocalDate(`${year}-07-20`), end: parseLocalDate(`${year}-12-09`) },
  ];
}

function periodLabel(term: string, year: number, locale: Locale): string {
  return locale === "en" ? `Term ${term} ${year}` : `${term} Periodo ${year}`;
}

/** The MEP academic-year start for a date: February..December belong to that year. */
function mepAcademicYearStart(when: Date): number {
  const year = when.getFullYear();
  // If the date is in January, it belongs to the previous academic year.
  return when.getMonth() === 0 ? year - 1 : year;
}

/** Best-effort period label for a date (falls back to the year itself). */
export function schoolPeriodLabel(iso: string, locale: Locale = "es"): string {
  const when = new Date(iso);
  if (Number.isNaN(when.getTime())) return "";

  const year = mepAcademicYearStart(when);
  const periods = MEP_DATES[year] ?? defaultMepSystem(year);

  // Prefer the period that contains the date.
  const t = when.getTime();
  for (const period of periods) {
    if (t >= period.start.getTime() && t <= period.end.getTime()) {
      return periodLabel(period.term, year, locale);
    }
  }

  // Between periods (vacaciones) or after the year ends: report the year only
  // if not in a known period.
  for (const period of periods) {
    if (t < period.start.getTime()) return `${year}`;
  }

  return `${year}`;
}
