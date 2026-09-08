import "server-only";

import { cache } from "react";
import { createSessionClient } from "@/lib/supabase/session";
import { getTeacherSession } from "@/lib/auth/teacher-session";

export type SubmittedReport = {
  classId: string;
  groupName: string;
  subjectId: string | null;
  subjectName: string | null;
  period: string;
  submittedAt: string;
  grades: Record<string, Record<string, { mark: number; maxMarks: number }>>;
  studentNames: Record<string, string>;
  assignmentTitles: Record<string, string>;
  gradedStudents: number;
  totalStudents: number;
};

/**
 * Loads the reports the signed-in teacher has submitted, newest first. RLS
 * (`class_reports_teacher_select`) scopes rows to the teacher's own reports in
 * their tenant, so nothing from other teachers or schools leaks. Assignments
 * (exam columns) are resolved to their titles so the list renders readable
 * column headers.
 */
export const loadMyReports = cache(
  async (): Promise<SubmittedReport[]> => {
  const session = await getTeacherSession();
  if (!session) return [];

  const supabase = await createSessionClient();

  const { data: reports, error } = await supabase
    .from("class_reports")
    .select(
      "class_id, subject_id, period, submitted_at, grades_snapshot, student_names, summary, classes(id, name, grade, section)",
    )
    .order("submitted_at", { ascending: false });

  if (error || !reports) return [];

  // Resolve assignment titles + subject names in bulk.
  const reportClassIds = [...new Set(reports.map((r) => r.class_id))];
  const { data: assignments } = await supabase
    .from("assignments")
    .select("id, title")
    .in("class_id", reportClassIds);
  const titleById = new Map((assignments ?? []).map((a) => [a.id, a.title]));

  const subjectIds = [...new Set(reports.map((r) => r.subject_id).filter(Boolean) as string[])];
  const subjectNames = new Map<string, string>();
  if (subjectIds.length > 0) {
    const { data: subjects } = await supabase.from("subjects").select("id, name").in("id", subjectIds);
    for (const s of subjects ?? []) subjectNames.set(s.id, s.name);
  }

  const out: SubmittedReport[] = [];
  for (const row of reports) {
    const klass = row.classes as
      | { id: string; name: string | null; grade: string | null; section: string | null }
      | Array<{ id: string; name: string | null; grade: string | null; section: string | null }>
      | null;
    const klassRow = Array.isArray(klass) ? klass[0] : klass;
    const groupName =
      klassRow?.name?.trim() ||
      `${klassRow?.grade ?? ""}${klassRow?.section ?? ""}`.trim() ||
      "Grupo";

    const summary = (row.summary ?? {}) as { gradedStudents?: number; totalStudents?: number };
    const grades = (row.grades_snapshot ?? {}) as SubmittedReport["grades"];

    const assignmentTitles: Record<string, string> = {};
    for (const assignmentId of Object.keys(grades)) {
      assignmentTitles[assignmentId] = titleById.get(assignmentId) ?? "Examen";
    }

    out.push({
      classId: row.class_id,
      groupName,
      subjectId: row.subject_id ?? null,
      subjectName: row.subject_id ? (subjectNames.get(row.subject_id) ?? null) : null,
      period: row.period ?? "",
      submittedAt: row.submitted_at,
      grades,
      studentNames: (row.student_names ?? {}) as SubmittedReport["studentNames"],
      assignmentTitles,
      gradedStudents: summary.gradedStudents ?? 0,
      totalStudents: summary.totalStudents ?? 0,
    });
  }

  return out;
  },
);
