"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSessionClient } from "@/lib/supabase/session";
import { loadClassExams, type ExamColumn } from "@/lib/dashboard/exams";

export type ExamActionResult = { ok: true; id?: string } | { ok: false; error: string };

/** Loads the exam columns for a class+subject over a server action, so the
 * gradebook can switch subjects client-side without a full page reload. */
export async function fetchSubjectExams(input: {
  classId: string;
  subjectId: string | null;
}): Promise<{ ok: true; exams: ExamColumn[] } | { ok: false; error: string }> {
  const parsed = z
    .object({ classId: z.string().uuid(), subjectId: z.string().nullable() })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: "Parámetros inválidos." };
  const exams = await loadClassExams(parsed.data.classId, parsed.data.subjectId);
  return { ok: true, exams };
}

const addColumnSchema = z.object({
  classId: z.string().uuid(),
  title: z.string().trim().max(120),
  points: z.number().min(0).max(1000).nullable(),
  subjectId: z.string().uuid().nullable().optional(),
});

const saveGradeSchema = z.object({
  classId: z.string().uuid(),
  assignmentId: z.string().uuid(),
  studentId: z.string().uuid(),
  mark: z.number().min(0).max(1000).nullable(),
});

const removeColumnSchema = z.object({
  classId: z.string().uuid(),
  assignmentId: z.string().uuid(),
});

const updateColumnSchema = z.object({
  classId: z.string().uuid(),
  assignmentId: z.string().uuid(),
  title: z.string().trim().max(120).optional(),
  points: z.number().min(0).max(1000).nullable().optional(),
});

const gradeRestoreSchema = z.object({
  studentId: z.string().uuid(),
  mark: z.number().min(0).max(1000),
  maxMarks: z.number().min(0).max(1000),
});

const restoreColumnSchema = z.object({
  classId: z.string().uuid(),
  assignmentId: z.string().uuid(),
  title: z.string().trim().max(120),
  points: z.number().min(0).max(1000).nullable(),
  grades: z.array(gradeRestoreSchema),
});

/** Adds a grade column (an assignment) to a group the teacher manages. */
export async function addExamColumn(input: {
  classId: string;
  title: string;
  points: number | null;
  subjectId?: string | null;
}): Promise<ExamActionResult> {
  const parsed = addColumnSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "El título o los puntos no son válidos." };
  }

  const supabase = await createSessionClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const tenant_id = user?.app_metadata?.tenant_id ?? user?.user_metadata?.tenant_id;
  if (typeof tenant_id !== "string") {
    return { ok: false, error: "Sesión inválida. Inicie sesión de nuevo." };
  }

  const { data, error } = await supabase
    .from("assignments")
    .insert({
      tenant_id,
      class_id: parsed.data.classId,
      subject_id: parsed.data.subjectId ?? null,
      title: parsed.data.title,
      points: parsed.data.points,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { ok: false, error: "No se pudo agregar la columna. Intente de nuevo." };
  }

  revalidatePath(`/grupos/${parsed.data.classId}`);
  return { ok: true, id: data.id };
}

/**
 * Sets a student's score in a column. Marks are clamped to the column's max
 * points (default 100). An empty value clears the grade (deletes the row).
 */
export async function saveGrade(input: {
  classId: string;
  assignmentId: string;
  studentId: string;
  mark: number | null;
}): Promise<ExamActionResult> {
  const parsed = saveGradeSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "La nota no es válida." };
  }
  const { classId, assignmentId, studentId, mark } = parsed.data;

  const supabase = await createSessionClient();

  if (mark === null) {
    const { error } = await supabase
      .from("grades")
      .delete()
      .eq("class_id", classId)
      .eq("student_id", studentId)
      .eq("assignment_id", assignmentId);
    if (error) return { ok: false, error: "No se pudo guardar la nota." };
    return { ok: true };
  }

  const { data: assignment } = await supabase
    .from("assignments")
    .select("points")
    .eq("id", assignmentId)
    .maybeSingle();
  const maxMarks = assignment?.points ?? 100;
  const clamped = Math.max(0, Math.min(mark, maxMarks));

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const tenant_id = user?.app_metadata?.tenant_id ?? user?.user_metadata?.tenant_id;
  if (typeof tenant_id !== "string") {
    return { ok: false, error: "Sesión inválida. Inicie sesión de nuevo." };
  }

  const { error } = await supabase.from("grades").upsert(
    {
      tenant_id,
      class_id: classId,
      student_id: studentId,
      assignment_id: assignmentId,
      mark: clamped,
      max_marks: maxMarks,
    },
    { onConflict: "class_id,student_id,assignment_id" },
  );
  if (error) {
    return { ok: false, error: "No se pudo guardar la nota. Intente de nuevo." };
  }
  return { ok: true };
}

/**
 * Updates a grade column's title and/or max points. Only the provided fields
 * are changed; `points` may be set to null to fall back to the default (100).
 */
export async function updateExamColumn(input: {
  classId: string;
  assignmentId: string;
  title?: string;
  points?: number | null;
}): Promise<ExamActionResult> {
  const parsed = updateColumnSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "El título o los puntos no son válidos." };
  }
  const { classId, assignmentId, title, points } = parsed.data;

  const patch: Record<string, unknown> = {};
  if (title !== undefined) patch.title = title;
  if (points !== undefined) patch.points = points;
  if (Object.keys(patch).length === 0) return { ok: true };

  const supabase = await createSessionClient();
  const { error } = await supabase
    .from("assignments")
    .update(patch)
    .eq("id", assignmentId)
    .eq("class_id", classId);
  if (error) return { ok: false, error: "No se pudo actualizar la columna." };

  revalidatePath(`/grupos/${classId}`);
  return { ok: true };
}

/** Removes a grade column (assignment) the teacher manages. */
export async function removeExamColumn(input: {
  classId: string;
  assignmentId: string;
}): Promise<ExamActionResult> {
  const parsed = removeColumnSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Solicitud no válida." };

  const supabase = await createSessionClient();
  const { error } = await supabase
    .from("assignments")
    .delete()
    .eq("id", parsed.data.assignmentId)
    .eq("class_id", parsed.data.classId);
  if (error) return { ok: false, error: "No se pudo eliminar la columna." };

  revalidatePath(`/grupos/${parsed.data.classId}`);
  return { ok: true };
}

/**
 * Restores a previously deleted grade column (assignment) with its original
 * id, so the grades entered under it are re-linked. Used by the undo flow.
 */
export async function restoreExamColumn(input: {
  classId: string;
  assignmentId: string;
  title: string;
  points: number | null;
  grades: Array<{ studentId: string; mark: number; maxMarks: number }>;
}): Promise<ExamActionResult> {
  const parsed = restoreColumnSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "La columna que se quiere restaurar no es válida." };
  }
  const { classId, assignmentId, title, points, grades } = parsed.data;

  const supabase = await createSessionClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const tenant_id = user?.app_metadata?.tenant_id ?? user?.user_metadata?.tenant_id;
  if (typeof tenant_id !== "string") {
    return { ok: false, error: "Sesión inválida. Inicie sesión de nuevo." };
  }

  const { error: insertError } = await supabase
    .from("assignments")
    .insert({
      id: assignmentId,
      tenant_id,
      class_id: classId,
      title,
      points,
    });
  if (insertError) {
    return { ok: false, error: "No se pudo restaurar la columna. Intente de nuevo." };
  }

  if (grades.length > 0) {
    const { error: gradesError } = await supabase.from("grades").insert(
      grades.map((grade) => ({
        tenant_id,
        class_id: classId,
        student_id: grade.studentId,
        assignment_id: assignmentId,
        mark: grade.mark,
        max_marks: grade.maxMarks,
      })),
    );
    if (gradesError) {
      return { ok: false, error: "La columna se restauró pero las notas no." };
    }
  }

  revalidatePath(`/grupos/${classId}`);
  return { ok: true };
}
