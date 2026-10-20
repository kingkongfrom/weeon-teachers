"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSessionClient } from "@/lib/supabase/session";
import {
  CONDUCT_CATEGORIES,
  isCategoryValidForKind,
  type ConductCategory,
  type ConductKind,
} from "@/lib/conduct/model";

export type ConductActionResult =
  | { ok: true; id?: string; ids?: string[] }
  | { ok: false; error: string };

const kindSchema = z.enum(["merit", "demerit"]);
const categorySchema = z.enum(CONDUCT_CATEGORIES as [ConductCategory, ...ConductCategory[]]);

/** Points are chosen by the teacher (a serious falta can be 10 or 20). */
const pointsSchema = z.number().int().min(1).max(100);

const addRecordsSchema = z.object({
  classId: z.string().uuid(),
  /** One or many: a group-wide falta is logged for every selected student. */
  studentIds: z.array(z.string().uuid()).min(1).max(200),
  occurredOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  kind: kindSchema,
  category: categorySchema,
  description: z.string().trim().min(3).max(1000),
  points: pointsSchema,
});

const deleteRecordSchema = z.object({
  classId: z.string().uuid(),
  recordId: z.string().uuid(),
});

function revalidateGrupo(classId: string) {
  revalidatePath(`/grupos/${classId}`);
}

/**
 * Registers one mérito/falta for one or several students of a group. The same
 * category, description, date and points apply to every selected student, so a
 * group-wide falta (the whole class talking during an exam) is one action.
 */
export async function addConductRecords(input: {
  classId: string;
  studentIds: string[];
  occurredOn: string;
  kind: ConductKind;
  category: ConductCategory;
  description: string;
  points: number;
}): Promise<ConductActionResult> {
  const parsed = addRecordsSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Revise los datos de la anotación." };
  }

  const { classId, occurredOn, kind, category, description, points } = parsed.data;
  const studentIds = [...new Set(parsed.data.studentIds)];

  if (!isCategoryValidForKind(kind, category)) {
    return { ok: false, error: "La categoría no corresponde al tipo de anotación." };
  }

  const supabase = await createSessionClient();

  // Never attribute a falta to a student who left the group: the roster shown
  // by the page is the allowed set.
  const { data: enrolled, error: rosterError } = await supabase
    .from("enrollments")
    .select("student_id")
    .eq("class_id", classId)
    .in("student_id", studentIds);
  if (rosterError) {
    return { ok: false, error: "No se pudo verificar la lista del grupo." };
  }
  const allowed = new Set((enrolled ?? []).map((row) => row.student_id as string));
  const targets = studentIds.filter((id) => allowed.has(id));
  if (targets.length === 0) {
    return { ok: false, error: "Los estudiantes seleccionados no pertenecen a este grupo." };
  }

  const { data, error } = await supabase
    .from("conduct_records")
    .insert(
      targets.map((studentId) => ({
        class_id: classId,
        student_id: studentId,
        occurred_on: occurredOn,
        kind,
        category,
        description,
        points,
      })),
    )
    .select("id");

  if (error) {
    return { ok: false, error: "No se pudo registrar la anotación." };
  }

  revalidateGrupo(classId);
  const ids = (data ?? []).map((row) => row.id as string);
  return { ok: true, ids };
}

/** Back-compat single-student helper (same rules as {@link addConductRecords}). */
export async function addConductRecord(input: {
  classId: string;
  studentId: string;
  occurredOn: string;
  kind: ConductKind;
  category: ConductCategory;
  description: string;
  points: number;
}): Promise<ConductActionResult> {
  return addConductRecords({ ...input, studentIds: [input.studentId] });
}

/** Removes a conduct entry. Teachers may delete any row in groups they teach. */
export async function deleteConductRecord(input: {
  classId: string;
  recordId: string;
}): Promise<ConductActionResult> {
  const parsed = deleteRecordSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Parámetros inválidos." };
  }

  const supabase = await createSessionClient();
  const { error } = await supabase
    .from("conduct_records")
    .delete()
    .eq("id", parsed.data.recordId)
    .eq("class_id", parsed.data.classId);

  if (error) {
    return { ok: false, error: "No se pudo eliminar la anotación." };
  }

  revalidateGrupo(parsed.data.classId);
  return { ok: true };
}
