/** Client-safe helpers shared by the server loaders and client components in
 * the students UI. No server-only imports here. */

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
export function finalScoreStatus(score: number | null): {
  label: string;
  tone: "excellent" | "passed" | "at-risk" | "none";
} {
  if (score === null) return { label: "Sin notas", tone: "none" };
  if (score >= 90) return { label: "Excelente", tone: "excellent" };
  if (score >= 70) return { label: "Aprobado", tone: "passed" };
  return { label: "En riesgo", tone: "at-risk" };
}
