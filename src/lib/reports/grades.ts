import type { ReportGradeCell, ReportGradesSnapshot } from "@/lib/reports/model";

export type ReportGradeView = {
  grades: ReportGradesSnapshot;
  studentNames: Record<string, string>;
  assignmentTitles: Record<string, string>;
};

/** Mean percentage (0..100) or null when the student has no graded exams. */
export function computeReportAverage(
  grades: ReportGradesSnapshot,
  studentId: string,
): number | null {
  let sum = 0;
  let count = 0;
  for (const assignment of Object.values(grades)) {
    const grade = assignment[studentId];
    if (!grade) continue;
    const max = grade.maxMarks || 100;
    if (max <= 0) continue;
    sum += (grade.mark / max) * 100;
    count += 1;
  }
  if (count === 0) return null;
  return sum / count;
}

export function isReportPassing(pct: number | null): boolean | null {
  if (pct === null) return null;
  return Math.round(pct) >= 70;
}

/** Union of student ids across assignments, optionally ordered by name. */
export function collectReportStudentIds(
  report: ReportGradeView,
  orderedIds?: string[],
): string[] {
  const seen = new Set<string>();
  for (const assignment of Object.values(report.grades)) {
    for (const studentId of Object.keys(assignment)) seen.add(studentId);
  }
  if (orderedIds?.length) {
    const ordered = orderedIds.filter((id) => seen.has(id));
    for (const id of seen) {
      if (!ordered.includes(id)) ordered.push(id);
    }
    return ordered;
  }
  return [...seen];
}

export function formatGradeCell(grade: ReportGradeCell | undefined): string {
  if (!grade) return "—";
  return `${grade.mark}${grade.maxMarks ? `/${grade.maxMarks}` : ""}`;
}
