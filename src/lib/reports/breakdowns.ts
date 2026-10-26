import type { AttendanceStatus } from "@/lib/attendance/model";
import type { ConductCategory, ConductKind } from "@/lib/conduct/model";
import type {
  ReportAssignmentMeta,
  ReportConductLogEntry,
  ReportGradesSnapshot,
} from "@/lib/reports/model";
import { reportStudentPercent } from "@/lib/reports/grades";
import { classStats, type ClassStats } from "@/lib/dashboard/scoreboard";

export type AssignmentBreakdownRow = {
  assignmentId: string;
  meta: ReportAssignmentMeta;
  avgPct: number | null;
  gradedCount: number;
  totalStudents: number;
};

export type ConductCategoryBreakdown = {
  category: ConductCategory;
  meritCount: number;
  demeritCount: number;
};

export function buildAssignmentBreakdown(
  grades: ReportGradesSnapshot,
  assignmentsMeta: Record<string, ReportAssignmentMeta>,
  totalStudents: number,
): AssignmentBreakdownRow[] {
  return Object.keys(grades).map((assignmentId) => {
    const meta = assignmentsMeta[assignmentId] ?? {
      title: assignmentId.slice(0, 6),
      kind: "classwork" as const,
      category: "classwork" as const,
      points: null,
    };
    const byStudent = grades[assignmentId] ?? {};
    const gradedCount = Object.keys(byStudent).length;
    let sum = 0;
    let count = 0;
    for (const grade of Object.values(byStudent)) {
      const max = grade.maxMarks || 100;
      if (max <= 0) continue;
      sum += (grade.mark / max) * 100;
      count += 1;
    }
    return {
      assignmentId,
      meta,
      avgPct: count > 0 ? sum / count : null,
      gradedCount,
      totalStudents,
    };
  });
}

export function buildConductCategoryBreakdown(
  entries: ReportConductLogEntry[],
): ConductCategoryBreakdown[] {
  const byCategory = new Map<
    ConductCategory,
    { meritCount: number; demeritCount: number }
  >();
  for (const row of entries) {
    const current = byCategory.get(row.category) ?? { meritCount: 0, demeritCount: 0 };
    if (row.kind === "merit") current.meritCount += 1;
    else current.demeritCount += 1;
    byCategory.set(row.category, current);
  }
  return [...byCategory.entries()]
    .map(([category, counts]) => ({ category, ...counts }))
    .sort((a, b) => b.demeritCount + b.meritCount - (a.demeritCount + a.meritCount));
}

/**
 * Class statistics for the report header.
 *
 * Delegates to `classStats` from `scoreboard` — the same function the gradebook
 * summary strip uses — so the report and the screen a teacher is copying from
 * cannot show a different average, pass rate, or range. It used to compute the
 * average inline, which worked but meant two definitions of "average" in one app.
 */
export function classGradeStats(
  grades: ReportGradesSnapshot,
  studentIds: string[],
  finals?: Record<string, number>,
): ClassStats & { passed: number } {
  const stats = classStats(
    studentIds.map((studentId) => reportStudentPercent(grades, studentId, finals)),
  );
  return {
    ...stats,
    // `passRate` is a percentage; the report prints "12 de 15".
    passed:
      stats.passRate == null ? 0 : Math.round((stats.passRate / 100) * stats.graded),
  };
}

export function isLateAttendanceStatus(status: AttendanceStatus): boolean {
  return status === "late_justified" || status === "late_unjustified";
}

export function isAbsenceAttendanceStatus(status: AttendanceStatus): boolean {
  return status === "absence_justified" || status === "absence_unjustified";
}

export function conductKindLabel(kind: ConductKind): "merit" | "demerit" {
  return kind;
}
