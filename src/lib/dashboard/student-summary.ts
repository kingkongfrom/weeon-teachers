/** Client-safe helpers shared by the server loaders and client components in
 * the students UI. No server-only imports here. */

import type { Locale } from "@/lib/i18n/config";

export type StudentGroupScore = {
  id: string;
  name: string;
  finalScore: number | null; // 0..100, null when the group has no grades yet
  gradedExams: number;
};

export function fullName(student: {
  firstName: string;
  lastName: string;
  secondLastName: string | null;
}): string {
  return `${student.firstName} ${student.lastName}${
    student.secondLastName ? ` ${student.secondLastName}` : ""
  }`.trim();
}

/** Status label + tone for a student's final score in a group. The pass
 * threshold mirrors the gradebook histogram (>= 70 is passing). */
export function finalScoreStatus(
  score: number | null,
  locale: Locale = "es",
): {
  label: string;
  tone: "excellent" | "passed" | "at-risk" | "none";
} {
  const labels =
    locale === "en"
      ? { none: "No grades", excellent: "Excellent", passed: "Passed", atRisk: "At risk" }
      : { none: "Sin notas", excellent: "Excelente", passed: "Aprobado", atRisk: "En riesgo" };

  if (score === null) return { label: labels.none, tone: "none" };
  if (score >= 90) return { label: labels.excellent, tone: "excellent" };
  if (score >= 70) return { label: labels.passed, tone: "passed" };
  return { label: labels.atRisk, tone: "at-risk" };
}
