import "server-only";

import { cache } from "react";
import { getTeacherSession } from "@/lib/auth/teacher-session";
import { createSessionClient } from "@/lib/supabase/session";
import { loadTeacherTeachingScope } from "@/lib/dashboard/teacher-scope";

export type GradingInboxItem = {
  submissionId: string;
  assessmentId: string;
  assessmentTitle: string;
  classId: string;
  groupName: string;
  studentId: string;
  studentName: string;
  submittedAt: string | null;
};

/**
 * Every turned-in-but-unreturned submission across the teacher's grupos, oldest
 * first — the cross-group "Por evaluar" inbox. RLS scopes rows to `teaches_class`.
 */
export const loadGradingInbox = cache(async (): Promise<GradingInboxItem[]> => {
  const session = await getTeacherSession();
  if (!session) return [];

  const supabase = await createSessionClient();
  const { classIds } = await loadTeacherTeachingScope(supabase, session);
  if (classIds.length === 0) return [];

  const { data: assessments } = await supabase
    .from("assessments")
    .select("id, title, class_id")
    .in("class_id", classIds);
  if (!assessments || assessments.length === 0) return [];

  const assessmentById = new Map(
    (assessments as Array<{ id: string; title: string; class_id: string }>).map((row) => [row.id, row]),
  );

  const { data: submissions } = await supabase
    .from("submissions")
    .select("id, assessment_id, student_id, submitted_at")
    .in("assessment_id", [...assessmentById.keys()])
    .eq("state", "submitted")
    .order("submitted_at", { ascending: true });
  if (!submissions || submissions.length === 0) return [];

  const studentIds = [...new Set((submissions as Array<{ student_id: string }>).map((row) => row.student_id))];
  const [{ data: classes }, { data: students }] = await Promise.all([
    supabase.from("classes").select("id, name, grade, section").in("id", classIds),
    supabase.from("students").select("id, first_name, last_name").in("id", studentIds),
  ]);

  const groupName = new Map<string, string>();
  for (const row of classes ?? []) {
    groupName.set(
      row.id,
      row.name?.trim() || [row.grade, row.section].filter(Boolean).join("").toUpperCase() || "Grupo",
    );
  }
  const studentName = new Map<string, string>();
  for (const row of students ?? []) {
    studentName.set(row.id, `${row.last_name} ${row.first_name}`.trim());
  }

  return (
    submissions as Array<{
      id: string;
      assessment_id: string;
      student_id: string;
      submitted_at: string | null;
    }>
  ).flatMap((row) => {
    const assessment = assessmentById.get(row.assessment_id);
    if (!assessment) return [];
    return [
      {
        submissionId: row.id,
        assessmentId: assessment.id,
        assessmentTitle: assessment.title,
        classId: assessment.class_id,
        groupName: groupName.get(assessment.class_id) ?? "",
        studentId: row.student_id,
        studentName: studentName.get(row.student_id) ?? "Estudiante",
        submittedAt: row.submitted_at,
      },
    ];
  });
});
