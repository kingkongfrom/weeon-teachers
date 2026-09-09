"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSessionClient } from "@/lib/supabase/session";
import { getTeacherSession } from "@/lib/auth/teacher-session";
import { loadClassExams } from "@/lib/dashboard/exams";
import { schoolPeriodLabel } from "@/lib/dashboard/school-period";

export type SubmitReportResult = { ok: true } | { ok: false; error: string };

const submitReportSchema = z.object({
  classId: z.string().uuid(),
  subjectId: z.string().uuid().nullable().optional(),
});

/**
 * Submits (or replaces) the class report: snapshots the class's current grades
 * into `class_reports` so the Reportes page can render them. The snapshot is
 * read server-side (never trusted from the client) and is isolated to the
 * signed-in teacher via RLS (teaches_class + tenant + teacher_profile_id).
 * Scope = one subject per group, so a primaria teacher files one report per
 * subject, while a secundaria teacher files one report per class.
 */
export async function submitClassReport(input: {
  classId: string;
  subjectId?: string | null;
}): Promise<SubmitReportResult> {
  const parsed = submitReportSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Parámetros inválidos." };

  const session = await getTeacherSession();
  if (!session) return { ok: false, error: "Sesión inválida." };

  const supabase = await createSessionClient();

  // Server-side snapshot of the class grades (RLS-scoped to this teacher).
  const exams = await loadClassExams(parsed.data.classId, parsed.data.subjectId);
  if (exams.length === 0) {
    return {
      ok: false,
      error: "Agregue al menos una evaluación antes de subir el reporte.",
    };
  }

  const gradesSnapshot: Record<string, Record<string, { mark: number; maxMarks: number }>> = {};
  const namesById: Record<string, string> = {};
  const summary: { gradedStudents: number; totalStudents: number } = {
    gradedStudents: 0,
    totalStudents: 0,
  };

  for (const exam of exams) {
    gradesSnapshot[exam.id] = exam.grades;
  }

  // Student names so the Reportes list can render readable rows.
  const { data: students } = await supabase
    .from("students")
    .select("id, first_name, last_name, second_last_name")
    .order("last_name")
    .order("first_name");
  for (const student of students ?? []) {
    namesById[student.id] =
      `${student.first_name} ${student.last_name}${
        student.second_last_name ? ` ${student.second_last_name}` : ""
      }`.trim();
  }

  const enrolled: string[] = [];
  if (students) {
    const { data: enrollments } = await supabase
      .from("enrollments")
      .select("student_id")
      .eq("class_id", parsed.data.classId)
      .is("dropped_at", null);
    for (const row of enrollments ?? []) enrolled.push(row.student_id);
  }

  // Count how many students have at least one grade across any exam.
  const gradedIds = new Set<string>();
  for (const exam of exams) {
    for (const studentId of Object.keys(exam.grades)) {
      if (exam.grades[studentId] != null) gradedIds.add(studentId);
    }
  }
  summary.totalStudents = enrolled.length;
  summary.gradedStudents = gradedIds.size;

  // Compute the school period once (server-side) and use it in the upsert key,
  // so a resubmit within the same period + group + subject + teacher replaces
  // the report instead of creating a duplicate. Different groups are distinct
  // class_ids; a different subject is a distinct subject_id.
  const period = schoolPeriodLabel(new Date().toISOString());

  const { error } = await supabase.from("class_reports").upsert(
    {
      class_id: parsed.data.classId,
      subject_id: parsed.data.subjectId ?? null,
      teacher_profile_id: session.userId,
      grades_snapshot: gradesSnapshot,
      student_names: namesById,
      summary,
      period,
    },
    { onConflict: "class_id,subject_id,teacher_profile_id,period" },
  );

  if (error) return { ok: false, error: error.message };

  revalidatePath("/reportes");
  revalidatePath(`/grupos/${parsed.data.classId}`);
  return { ok: true };
}
