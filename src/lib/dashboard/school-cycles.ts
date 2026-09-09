/** Costa Rica: 1°–6° primaria, 7°–12° secundaria. Matches weeon-tenants. */

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
export function schoolCycleName(grade: string): string {
  const cycle = schoolCycleForGrade(grade);
  if (cycle === "primaria") return "Primaria";
  if (cycle === "secundaria") return "Secundaria";
  return "";
}
