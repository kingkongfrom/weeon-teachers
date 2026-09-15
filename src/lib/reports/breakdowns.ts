import type { AttendanceStatus } from "@/lib/attendance/model";
import type { ConductCategory, ConductKind } from "@/lib/conduct/model";
import type {
  ReportAssignmentMeta,
  ReportConductLogEntry,
  ReportGradesSnapshot,
} from "@/lib/reports/model";
import { computeReportAverage } from "@/lib/reports/grades";

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

export function classGradeStats(
  grades: ReportGradesSnapshot,
  studentIds: string[],
): { average: number | null; passed: number; graded: number } {
  let sum = 0;
  let count = 0;
  let passed = 0;
  for (const studentId of studentIds) {
    const pct = computeReportAverage(grades, studentId);
    if (pct === null) continue;
    sum += pct;
    count += 1;
    if (Math.round(pct) >= 70) passed += 1;
  }
  return {
    average: count > 0 ? sum / count : null,
    passed,
    graded: count,
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
