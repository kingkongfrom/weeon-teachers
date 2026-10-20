"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSessionClient } from "@/lib/supabase/session";
import {
  categoryFor,
  loadClassExams,
  loadClassRubros,
  type ExamColumn,
  type GradeRubro,
} from "@/lib/dashboard/exams";

export type ExamActionResult = { ok: true; id?: string } | { ok: false; error: string };

/** Loads the exam columns for a class+subject over a server action, so the
 * gradebook can switch subjects client-side without a full page reload. */
export async function fetchSubjectExams(input: {
  classId: string;
  subjectId: string | null;
}): Promise<
  { ok: true; exams: ExamColumn[]; rubros: GradeRubro[] } | { ok: false; error: string }
> {
  const parsed = z
    .object({ classId: z.string().uuid(), subjectId: z.string().nullable() })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: "Parámetros inválidos." };
  const [exams, rubros] = await Promise.all([
    loadClassExams(parsed.data.classId, parsed.data.subjectId),
    loadClassRubros(parsed.data.classId, parsed.data.subjectId),
  ]);
  return { ok: true, exams, rubros };
}

const addColumnSchema = z.object({
  classId: z.string().uuid(),
  title: z.string().trim().max(120),
  points: z.number().min(0).max(1000).nullable(),
  subjectId: z.string().uuid().nullable().optional(),
  kind: z.enum(["classwork", "homework", "exam", "quiz", "project"]).optional(),
  rubroId: z.string().uuid().optional(),
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
  rubroId: z.string().uuid().nullable().optional(),
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
  rubroId: z.string().uuid().nullable().optional(),
  grades: z.array(gradeRestoreSchema),
});

const rubroSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(60),
  peso: z.number().int().min(0).max(100),
  position: z.number().int().min(0).max(1000),
  archived: z.boolean().optional(),
  remove: z.boolean().optional(),
});

const saveRubrosSchema = z.object({
  classId: z.string().uuid(),
  subjectId: z.string().uuid(),
  rubros: z.array(rubroSchema).max(40),
});

/** Adds a grade column (an assignment) to a group the teacher manages. */
export async function addExamColumn(input: {
  classId: string;
  title: string;
  points: number | null;
  subjectId?: string | null;
  kind?: "classwork" | "homework" | "exam" | "quiz" | "project";
  rubroId?: string;
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

  // Every grade column belongs to a subject. If the caller did not pick one,
  // derive it from the class's lessons; if the class has subjects and we still
  // can't resolve one, refuse rather than write an orphan (subject-less) column.
  let subjectId = parsed.data.subjectId ?? null;
  if (subjectId == null) {
    const { data: lesson } = await supabase
      .from("class_lessons")
      .select("subject_id")
      .eq("class_id", parsed.data.classId)
      .not("subject_id", "is", null)
      .limit(1)
      .maybeSingle();
    subjectId = (lesson?.subject_id as string | null) ?? null;
    if (subjectId == null) {
      return {
        ok: false,
        error: "Esta clase no tiene una materia asignada. Asigne una materia antes de agregar una columna de calificación.",
      };
    }
  }

  const { data, error } = await supabase
    .from("assignments")
    .insert({
      tenant_id,
      class_id: parsed.data.classId,
      subject_id: subjectId,
      title: parsed.data.title,
      points: parsed.data.points,
      kind: parsed.data.kind ?? "classwork",
      category: categoryFor(parsed.data.kind ?? "classwork"),
      rubro_id: parsed.data.rubroId ?? null,
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
      status: "graded",
    },
    { onConflict: "class_id,student_id,assignment_id" },
  );
  if (error) {
    return { ok: false, error: "No se pudo guardar la nota. Intente de nuevo." };
  }
  revalidatePath(`/grupos/${classId}`);
  revalidatePath(`/estudiantes/${studentId}`);
  return { ok: true };
}

/** Closes a grade column: enrolled students without a mark receive 0. */
export async function closeExamColumn(input: {
  classId: string;
  assignmentId: string;
}): Promise<ExamActionResult & { zerosInserted?: number }> {
  const parsed = removeColumnSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Solicitud no válida." };

  const supabase = await createSessionClient();
  const { data, error } = await supabase.rpc("close_assignment", {
    p_assignment_id: parsed.data.assignmentId,
  });

  if (error) {
    if (error.message.includes("not_allowed")) {
      return { ok: false, error: "No tiene permiso para cerrar esta columna." };
    }
    return { ok: false, error: "No se pudo cerrar la columna." };
  }

  const payload = (data ?? {}) as { zeros_inserted?: number };
  revalidatePath(`/grupos/${parsed.data.classId}`);
  return { ok: true, zerosInserted: Number(payload.zeros_inserted ?? 0) };
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
  rubroId?: string | null;
}): Promise<ExamActionResult> {
  const parsed = updateColumnSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "El título o los puntos no son válidos." };
  }
  const { classId, assignmentId, title, points, rubroId } = parsed.data;

  const patch: Record<string, unknown> = {};
  if (title !== undefined) patch.title = title;
  if (points !== undefined) patch.points = points;
  if (rubroId !== undefined) patch.rubro_id = rubroId;
  if (Object.keys(patch).length === 0) return { ok: true };

  const supabase = await createSessionClient();

  // Points define each grade's denominator, so once a column has grades the
  // maximum cannot move (a student would earn a different % for the same
  // answer). Title and rubro stay editable; a new column is the way to redo the
  // weighting.
  if (points !== undefined) {
    const { count } = await supabase
      .from("grades")
      .select("id", { count: "exact", head: true })
      .eq("assignment_id", assignmentId);
    if ((count ?? 0) > 0) {
      return {
        ok: false,
        error: "Los puntos de esta columna ya no se pueden cambiar porque hay calificaciones. Use una columna nueva.",
      };
    }
  }

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
  rubroId?: string | null;
  grades: Array<{ studentId: string; mark: number; maxMarks: number }>;
}): Promise<ExamActionResult> {
  const parsed = restoreColumnSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "La columna que se quiere restaurar no es válida." };
  }
  const { classId, assignmentId, title, points, rubroId, grades } = parsed.data;

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
      rubro_id: rubroId ?? null,
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
        status: "graded",
      })),
    );
    if (gradesError) {
      return { ok: false, error: "La columna se restauró pero las notas no." };
    }
  }

  revalidatePath(`/grupos/${classId}`);
  return { ok: true };
}

/**
 * Saves the whole rubric for one (class, subject) atomically through the
 * `replace_rubros` RPC. The editor sends every rubro; the RPC upserts by id,
 * inserts new rows and deletes the ones the teacher removed (only when they
 * have no columns).
 */
export async function saveRubros(input: {
  classId: string;
  subjectId: string;
  rubros: Array<{
    id?: string;
    name: string;
    peso: number;
    position: number;
    archived?: boolean;
    remove?: boolean;
  }>;
}): Promise<ExamActionResult> {
  const parsed = saveRubrosSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Los rubros no son válidos." };
  }

  const supabase = await createSessionClient();
  const { error } = await supabase.rpc("replace_rubros", {
    p_class: parsed.data.classId,
    p_subject: parsed.data.subjectId,
    p_rubros: parsed.data.rubros,
  });

  if (error) return { ok: false, error: rubroErrorMessage(error.message) };

  revalidatePath(`/grupos/${parsed.data.classId}`);
  return { ok: true };
}

/**
 * First-run helper: assigns the subject's columns without a rubro to the
 * rubro that matches their kind (Tareas / Exámenes / Proyectos by name).
 * Called by the wizard after the rubros are saved. Manual assignments are
 * never overwritten.
 */
export async function assignOrphanColumns(input: {
  classId: string;
  subjectId: string;
}): Promise<ExamActionResult> {
  const parsed = z
    .object({ classId: z.string().uuid(), subjectId: z.string().uuid() })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: "Solicitud no válida." };

  const supabase = await createSessionClient();
  const { error } = await supabase.rpc("assign_orphan_grade_columns", {
    p_class: parsed.data.classId,
    p_subject: parsed.data.subjectId,
  });

  if (error) return { ok: false, error: rubroErrorMessage(error.message) };

  revalidatePath(`/grupos/${parsed.data.classId}`);
  return { ok: true };
}

/** Moves one grade column to another rubro of the same subject. */
export async function moveColumnToRubro(input: {
  classId: string;
  assignmentId: string;
  rubroId: string;
}): Promise<ExamActionResult> {
  return updateExamColumn(input);
}

/**
 * Deletes every rubro of one (class, subject) and unassigns its columns.
 * Grade rows are untouched, so the teacher can start the rubric from scratch
 * without losing marks. The gradebook then shows the columns as "Sin rubro".
 */
export async function resetRubros(input: {
  classId: string;
  subjectId: string;
}): Promise<ExamActionResult> {
  const parsed = z
    .object({ classId: z.string().uuid(), subjectId: z.string().uuid() })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: "Solicitud no válida." };

  const supabase = await createSessionClient();
  const { error } = await supabase.rpc("reset_grade_rubros", {
    p_class: parsed.data.classId,
    p_subject: parsed.data.subjectId,
  });

  if (error) return { ok: false, error: rubroErrorMessage(error.message) };

  revalidatePath(`/grupos/${parsed.data.classId}`);
  return { ok: true };
}

function rubroErrorMessage(raw: string): string {
  if (
    raw.includes("Could not find the function") ||
    raw.includes("PGRST202") ||
    raw.includes("schema cache")
  ) {
    return "La función de rubros no está disponible en la base de datos. Aplique la migración 20261019160000_grade_rubros.sql e intente de nuevo.";
  }
  if (raw.includes("PGRST102")) {
    return "Los rubros enviados no tienen un formato válido.";
  }
  if (raw.includes("no_tenant")) {
    return "Sesión inválida. Inicie sesión de nuevo.";
  }
  if (raw.includes("rubro_name_duplicate")) {
    return "Ya existe un rubro con ese nombre en esta materia.";
  }
  if (raw.includes("rubro_has_columns")) {
    return "No se puede eliminar un rubro que tiene columnas. Archívelo o mueva sus columnas.";
  }
  if (raw.includes("rubro_name_required") || raw.includes("rubro_name_too_long")) {
    return "El nombre del rubro es obligatorio (máximo 60 caracteres).";
  }
  if (raw.includes("rubro_peso_invalid")) {
    return "El peso debe ser un número entero entre 0 y 100.";
  }
  if (raw.includes("rubro_not_found")) {
    return "Uno de los rubros ya no existe. Recargue la página.";
  }
  if (raw.includes("not_allowed")) {
    return "No tiene permiso para editar los rubros de este grupo.";
  }
  if (raw.includes("class_not_found") || raw.includes("subject_not_found")) {
    return "El grupo o la materia no existe.";
  }
  return "No se pudieron guardar los rubros. Intente de nuevo.";
}
