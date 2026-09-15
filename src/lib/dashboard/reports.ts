import "server-only";

import { cache } from "react";
import { createSessionClient } from "@/lib/supabase/session";
import { getTeacherSession } from "@/lib/auth/teacher-session";
import { collectReportStudentIds } from "@/lib/reports/grades";
import type {
  ReportAssignmentMeta,
  ReportAttendanceLogEntry,
  ReportAttendanceSnapshot,
  ReportConductLogEntry,
  ReportConductSnapshot,
  ReportDraft,
  ReportGradesSnapshot,
  SubmittedReportExtras,
} from "@/lib/reports/model";

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

type ReportQueryRow = {
  class_id: string;
  subject_id: string | null;
  period: string | null;
  submitted_at: string;
  updated_at: string;
  grades_snapshot: unknown;
  student_names: unknown;
  assignment_titles: unknown;
  assignments_meta: unknown;
  conduct_snapshot: unknown;
  conduct_log: unknown;
  attendance_snapshot: unknown;
  attendance_log: unknown;
  summary: unknown;
  classes:
    | { id: string; name: string | null; grade: string | null; section: string | null }
    | Array<{ id: string; name: string | null; grade: string | null; section: string | null }>
    | null;
};

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

/**
 * Loads the reports the signed-in teacher has submitted, newest first. RLS
 * scopes rows to the teacher's own reports in their tenant.
 */
export const loadMyReports = cache(async (): Promise<SubmittedReport[]> => {
  const session = await getTeacherSession();
  if (!session) return [];

  const supabase = await createSessionClient();

  const { data: reports, error } = await supabase
    .from("class_reports")
    .select(
      "class_id, subject_id, period, submitted_at, updated_at, grades_snapshot, student_names, assignment_titles, assignments_meta, conduct_snapshot, conduct_log, attendance_snapshot, attendance_log, summary, classes(id, name, grade, section)",
    )
    .order("updated_at", { ascending: false });

  if (error || !reports) return [];

  const reportClassIds = [...new Set(reports.map((r) => r.class_id))];
  const subjectIds = [...new Set(reports.map((r) => r.subject_id).filter(Boolean) as string[])];

  const [assignRes, subjectRes] = await Promise.all([
    supabase.from("assignments").select("id, title").in("class_id", reportClassIds),
    subjectIds.length > 0
      ? supabase.from("subjects").select("id, name").in("id", subjectIds)
      : Promise.resolve({ data: null, error: null }),
  ]);

  const liveTitleById = new Map((assignRes.data ?? []).map((a) => [a.id, a.title]));
  const subjectNames = new Map<string, string>();
  for (const s of subjectRes.data ?? []) subjectNames.set(s.id, s.name);

  const out: SubmittedReport[] = [];
  for (const row of reports as ReportQueryRow[]) {
    const klass = row.classes;
    const klassRow = Array.isArray(klass) ? klass[0] : klass;
    const groupName =
      klassRow?.name?.trim() ||
      `${klassRow?.grade ?? ""}${klassRow?.section ?? ""}`.trim() ||
      "Grupo";

    const summary = (row.summary ?? {}) as {
      gradedStudents?: number;
      totalStudents?: number;
      teacherNotes?: string;
    };
    const grades = (row.grades_snapshot ?? {}) as ReportGradesSnapshot;
    const storedTitles = (row.assignment_titles ?? {}) as Record<string, string>;
    const storedMeta = (row.assignments_meta ?? {}) as Record<string, ReportAssignmentMeta>;

    const assignmentTitles: Record<string, string> = {};
    const assignmentsMeta: Record<string, ReportAssignmentMeta> = {};
    for (const assignmentId of Object.keys(grades)) {
      assignmentTitles[assignmentId] =
        storedTitles[assignmentId] ?? liveTitleById.get(assignmentId) ?? "Examen";
      assignmentsMeta[assignmentId] = storedMeta[assignmentId] ?? {
        title: assignmentTitles[assignmentId],
        kind: "classwork",
        category: "classwork",
        points: null,
      };
    }

    out.push({
      classId: row.class_id,
      groupName,
      subjectId: row.subject_id ?? null,
      subjectName: row.subject_id ? (subjectNames.get(row.subject_id) ?? null) : null,
      period: row.period ?? "",
      submittedAt: row.submitted_at,
      updatedAt: row.updated_at,
      grades,
      studentNames: (row.student_names ?? {}) as SubmittedReport["studentNames"],
      assignmentTitles,
      assignmentsMeta,
      gradedStudents: summary.gradedStudents ?? 0,
      totalStudents: summary.totalStudents ?? 0,
      conduct: (row.conduct_snapshot ?? {}) as ReportConductSnapshot,
      conductLog: (row.conduct_log ?? []) as ReportConductLogEntry[],
      attendance: (row.attendance_snapshot ?? {}) as ReportAttendanceSnapshot,
      attendanceLog: (row.attendance_log ?? []) as ReportAttendanceLogEntry[],
      teacherNotes: summary.teacherNotes?.trim() || null,
    });
  }

  return out;
});

/** Number of reports the signed-in teacher has submitted. */
export const loadMyReportCount = cache(async (): Promise<number> => {
  const session = await getTeacherSession();
  if (!session) return 0;

  const supabase = await createSessionClient();
  const { count } = await supabase
    .from("class_reports")
    .select("id", { count: "exact", head: true });

  return count ?? 0;
});
