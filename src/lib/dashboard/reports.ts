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
  updatedAt: string;
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
      "class_id, subject_id, period, submitted_at, updated_at, grades_snapshot, student_names, summary, classes(id, name, grade, section)",
    )
    .order("updated_at", { ascending: false });

  if (error || !reports) return [];

  // Resolve assignment titles + subject names concurrently (both depend only on
  // the loaded reports).
  const reportClassIds = [...new Set(reports.map((r) => r.class_id))];
  const subjectIds = [...new Set(reports.map((r) => r.subject_id).filter(Boolean) as string[])];

  const [assignRes, subjectRes] = await Promise.all([
    supabase.from("assignments").select("id, title").in("class_id", reportClassIds),
    subjectIds.length > 0
      ? supabase.from("subjects").select("id, name").in("id", subjectIds)
      : Promise.resolve({ data: null, error: null }),
  ]);

  const titleById = new Map((assignRes.data ?? []).map((a) => [a.id, a.title]));
  const subjectNames = new Map<string, string>();
  for (const s of subjectRes.data ?? []) subjectNames.set(s.id, s.name);

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
      updatedAt: row.updated_at,
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

/** Number of reports the signed-in teacher has submitted. Head count only, so
 * the panel footer stays cheap and does not deserialize grade snapshots. */
export const loadMyReportCount = cache(async (): Promise<number> => {
  const session = await getTeacherSession();
  if (!session) return 0;

  const supabase = await createSessionClient();
  const { count } = await supabase
    .from("class_reports")
    .select("id", { count: "exact", head: true });

  return count ?? 0;
});
