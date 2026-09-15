"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSessionClient } from "@/lib/supabase/session";
import { getTeacherSession } from "@/lib/auth/teacher-session";
import { loadTeacherGrupo } from "@/lib/dashboard/grupos";
import { loadGradebookContext } from "@/lib/dashboard/gradebook";
import { buildReportDraft } from "@/lib/reports/build-snapshot";

export type SubmitReportResult = { ok: true } | { ok: false; error: string };

const submitReportSchema = z.object({
  classId: z.string().uuid(),
  subjectId: z.string().uuid().nullable().optional(),
  teacherNotes: z.string().max(2000).optional(),
});

/**
 * Submits (or replaces) the class report: snapshots grades, conduct, and
 * attendance into `class_reports`. Data is read server-side (never trusted
 * from the client) and scoped to the signed-in teacher via RLS.
 */
export async function submitClassReport(input: {
  classId: string;
  subjectId?: string | null;
  teacherNotes?: string;
}): Promise<SubmitReportResult> {
  const parsed = submitReportSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Parámetros inválidos." };

  const session = await getTeacherSession();
  if (!session) return { ok: false, error: "Sesión inválida." };

  const detail = await loadTeacherGrupo(parsed.data.classId);
  if (!detail) return { ok: false, error: "Grupo no encontrado." };

  const ctx = await loadGradebookContext();
  const currentClass = ctx.classes.find((c) => c.id === parsed.data.classId);
  const subjects = currentClass?.subjects ?? [];
  const subjectId = parsed.data.subjectId ?? null;
  const subjectName =
    subjectId != null ? (subjects.find((s) => s.id === subjectId)?.name ?? null) : null;

  const built = await buildReportDraft({
    classId: parsed.data.classId,
    subjectId,
    groupName: detail.grupo.name,
    subjectName,
  });

  if ("error" in built) return { ok: false, error: built.error };

  const notes = parsed.data.teacherNotes?.trim() ?? "";
  const summary = {
    ...built.summary,
    ...(notes ? { teacherNotes: notes } : {}),
  };

  const supabase = await createSessionClient();

  const { error } = await supabase.from("class_reports").upsert(
    {
      class_id: parsed.data.classId,
      subject_id: subjectId,
      teacher_profile_id: session.userId,
      grades_snapshot: built.grades,
      student_names: built.studentNames,
      assignment_titles: built.assignmentTitles,
      assignments_meta: built.assignmentsMeta,
      conduct_snapshot: built.conduct,
      conduct_log: built.conductLog,
      attendance_snapshot: built.attendance,
      attendance_log: built.attendanceLog,
      summary,
      period: built.period,
    },
    { onConflict: "class_id,subject_id,teacher_profile_id,period" },
  );

  if (error) return { ok: false, error: error.message };

  revalidatePath("/reportes");
  revalidatePath(`/grupos/${parsed.data.classId}`);
  revalidatePath(`/grupos/${parsed.data.classId}/reporte`);
  return { ok: true };
}
