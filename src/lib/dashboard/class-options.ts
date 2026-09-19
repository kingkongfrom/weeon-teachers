/** Minimal grade helpers for Comunicación broadcast filters. */

export function formatGradeLabel(grade: string): string {
  return grade.replace(/°/g, "").trim();
}
