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

  const { data: periodLocked, error: lockCheckError } = await supabase.rpc(
    "report_period_is_locked",
    { p_tenant: session.tenantId, p_period: built.period },
  );
  if (lockCheckError && lockCheckError.code !== "PGRST202") {
    return { ok: false, error: "No se pudo verificar el periodo." };
  }
  if (periodLocked === true) {
    return {
      ok: false,
      error:
        "Este periodo está cerrado por la administración. No puede volver a enviar el reporte.",
    };
  }

  const { error } = await supabase.from("class_reports").upsert(
    {
      class_id: parsed.data.classId,
      subject_id: subjectId,
      teacher_profile_id: session.userId,
      grades_snapshot: built.grades,
      student_names: built.studentNames,
      assignment_titles: built.assignmentTitles,
      assignments_meta: built.assignmentsMeta,
      finals_snapshot: built.finals,
      conduct_snapshot: built.conduct,
      conduct_log: built.conductLog,
      attendance_snapshot: built.attendance,
      attendance_log: built.attendanceLog,
      summary,
      period: built.period,
      academic_year: built.academicYear,
    },
    { onConflict: "class_id,subject_id,teacher_profile_id,period" },
  );

  if (error) {
    const msg = error.message ?? "";
    if (/report_period|row-level security|violates row-level/i.test(msg)) {
      return {
        ok: false,
        error:
          "Este periodo está cerrado por la administración. No puede volver a enviar el reporte.",
      };
    }
    return { ok: false, error: msg };
  }

  revalidatePath("/reportes");
  revalidatePath(`/grupos/${parsed.data.classId}`);
  revalidatePath(`/grupos/${parsed.data.classId}/reporte`);
  return { ok: true };
}

/**
 * Per-student observations, saved alongside the class report.
 *
 * WHY THIS IS A SECOND ACTION
 *   `submitClassReport` upserts on (class, subject, teacher, period) and returns no id,
 *   so the notes need the report's identity before they can be attached. Splitting them
 *   keeps that upsert untouched - it is a shipped, load-bearing path - and lets the
 *   composer save notes and report in one user action while staying two clear steps
 *   server-side.
 *
 * WHY IT LOOKS THE REPORT UP
 *   The client never learns the report id (the upsert does not return it), and it should
 *   not: a client-supplied id would let a teacher attach notes to someone else's report.
 *   The row is resolved from the same columns the upsert keys on, so it can only ever be
 *   the caller's own report. RLS enforces the same thing again at write time.
 */
const studentNotesSchema = z.object({
  classId: z.string().uuid(),
  subjectId: z.string().uuid().nullable().optional(),
  /* studentId -> note. An empty or whitespace-only note means "remove my note". */
  notes: z.record(z.string().uuid(), z.string().max(1000)),
});

export async function saveClassReportStudentNotes(input: {
  classId: string;
  subjectId?: string | null;
  notes: Record<string, string>;
}): Promise<SubmitReportResult> {
  const parsed = studentNotesSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Parámetros inválidos." };

  const session = await getTeacherSession();
  if (!session) return { ok: false, error: "Sesión inválida." };

  const subjectId = parsed.data.subjectId ?? null;
  const built = await buildReportDraft({
    classId: parsed.data.classId,
    subjectId,
    groupName: "",
    subjectName: null,
  });
  if ("error" in built) return { ok: false, error: built.error };

  const supabase = await createSessionClient();

  /*
   * Only write notes for students who are actually in this report. A stale form (a
   * student removed from the grupo while it was open) must not create orphan rows.
   */
  const validStudentIds = new Set(built.studentIds);

  const reportQuery = supabase
    .from("class_reports")
    .select("id")
    .eq("class_id", parsed.data.classId)
    .eq("teacher_profile_id", session.userId)
    .eq("period", built.period)
    .eq("tenant_id", session.tenantId);
  const { data: report, error: reportError } = await (
    subjectId ? reportQuery.eq("subject_id", subjectId) : reportQuery.is("subject_id", null)
  )
    .limit(1)
    .maybeSingle();

  if (reportError) return { ok: false, error: "No se pudieron guardar las observaciones." };
  if (!report) {
    return { ok: false, error: "Envíe el reporte antes de guardar las observaciones." };
  }

  const rows = Object.entries(parsed.data.notes)
    .map(([studentId, note]) => ({ studentId, note: note.trim() }))
    .filter((entry) => validStudentIds.has(entry.studentId));

  const toUpsert = rows.filter((entry) => entry.note.length > 0);
  const toDelete = rows.filter((entry) => entry.note.length === 0).map((entry) => entry.studentId);

  if (toUpsert.length > 0) {
    const { error } = await supabase.from("class_report_student_notes").upsert(
      toUpsert.map((entry) => ({
        tenant_id: session.tenantId,
        report_id: report.id,
        student_id: entry.studentId,
        note: entry.note,
        updated_at: new Date().toISOString(),
      })),
      { onConflict: "report_id,student_id" },
    );
    if (error) return { ok: false, error: "No se pudieron guardar las observaciones." };
  }

  if (toDelete.length > 0) {
    const { error } = await supabase
      .from("class_report_student_notes")
      .delete()
      .eq("report_id", report.id)
      .in("student_id", toDelete);
    if (error) return { ok: false, error: "No se pudieron guardar las observaciones." };
  }

  revalidatePath("/reportes");
  revalidatePath(`/grupos/${parsed.data.classId}`);
  return { ok: true };
}
