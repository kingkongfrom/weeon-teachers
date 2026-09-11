/** Costa Rica: 1°–6° primaria, 7°–12° secundaria. Matches weeon-tenants. */

import type { Locale } from "@/lib/i18n/config";

export type SchoolCycle = "primaria" | "secundaria";

function gradeNumber(grade: string): number | null {
  const value = Number(grade.replace(/°/g, "").trim());
  return Number.isInteger(value) && value >= 1 && value <= 12 ? value : null;
}

export function schoolCycleForGrade(grade: string): SchoolCycle | null {
  const n = gradeNumber(grade);
  if (n == null) return null;
  if (n <= 6) return "primaria";
  return "secundaria";
}

/** Card subtitle: Primaria (1°–6°) or Secundaria (7°–12°). */
export function schoolCycleName(grade: string, locale: Locale = "es"): string {
  const cycle = schoolCycleForGrade(grade);
  if (cycle === "primaria") return locale === "en" ? "Elementary" : "Primaria";
  if (cycle === "secundaria") return locale === "en" ? "High school" : "Secundaria";
  return "";
}
