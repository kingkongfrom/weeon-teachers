import { collectReportStudentIds } from "@/lib/reports/grades";
import type { ReportDraft, ReportGradesSnapshot, SubmittedReportExtras } from "@/lib/reports/model";

/** Serializable row for `/reportes` list + client expand (no server-only). */
export type SubmittedReport = {
  classId: string;
  groupName: string;
  subjectId: string | null;
  subjectName: string | null;
  period: string;
  submittedAt: string;
  updatedAt: string;
  grades: ReportGradesSnapshot;
  studentNames: Record<string, string>;
  assignmentTitles: Record<string, string>;
  gradedStudents: number;
  totalStudents: number;
} & SubmittedReportExtras;

export function submittedReportKey(report: SubmittedReport): string {
  return `${report.classId}:${report.subjectId ?? "general"}:${report.submittedAt}`;
}

/** Adapts a stored report for the shared preview sections. */
export function submittedReportAsDraft(report: SubmittedReport): ReportDraft {
  const studentIds = collectReportStudentIds(report).sort((a, b) =>
    (report.studentNames[a] ?? a).localeCompare(report.studentNames[b] ?? b, "es"),
  );

  return {
    classId: report.classId,
    groupName: report.groupName,
    subjectId: report.subjectId,
    subjectName: report.subjectName,
    period: report.period,
    grades: report.grades,
    assignmentTitles: report.assignmentTitles,
    assignmentsMeta: report.assignmentsMeta,
    studentNames: report.studentNames,
    studentIds,
    conduct: report.conduct,
    conductLog: report.conductLog,
    attendance: report.attendance,
    attendanceLog: report.attendanceLog,
    summary: {
      gradedStudents: report.gradedStudents,
      totalStudents: report.totalStudents,
      ...(report.teacherNotes ? { teacherNotes: report.teacherNotes } : {}),
    },
  };
}

export function sortSubmittedReports(reports: SubmittedReport[]): SubmittedReport[] {
  return [...reports].sort((a, b) => {
    const byGroup = a.groupName.localeCompare(b.groupName, "es");
    if (byGroup !== 0) return byGroup;
    const periodA = a.period || a.submittedAt.slice(0, 10);
    const periodB = b.period || b.submittedAt.slice(0, 10);
    if (periodA !== periodB) return periodB.localeCompare(periodA);
    const bySubject = (a.subjectName ?? "").localeCompare(b.subjectName ?? "", "es");
    if (bySubject !== 0) return bySubject;
    return b.updatedAt.localeCompare(a.updatedAt);
  });
}
