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

export type ConductActionResult = { ok: true; id?: string } | { ok: false; error: string };

const kindSchema = z.enum(["merit", "demerit"]);
const categorySchema = z.enum(CONDUCT_CATEGORIES as [ConductCategory, ...ConductCategory[]]);

const addRecordSchema = z.object({
  classId: z.string().uuid(),
  studentId: z.string().uuid(),
  occurredOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  kind: kindSchema,
  category: categorySchema,
  description: z.string().trim().min(3).max(1000),
  points: z.number().int().min(1).max(5),
});

const deleteRecordSchema = z.object({
  classId: z.string().uuid(),
  recordId: z.string().uuid(),
});

function revalidateGrupo(classId: string) {
  revalidatePath(`/grupos/${classId}`);
}

/** Registers a mérito or falta for a student in a group. */
export async function addConductRecord(input: {
  classId: string;
  studentId: string;
  occurredOn: string;
  kind: ConductKind;
  category: ConductCategory;
  description: string;
  points: number;
}): Promise<ConductActionResult> {
  const parsed = addRecordSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Revise los datos de la anotación." };
  }

  if (!isCategoryValidForKind(parsed.data.kind, parsed.data.category)) {
    return { ok: false, error: "La categoría no corresponde al tipo de anotación." };
  }

  const supabase = await createSessionClient();
  const { data, error } = await supabase
    .from("conduct_records")
    .insert({
      class_id: parsed.data.classId,
      student_id: parsed.data.studentId,
      occurred_on: parsed.data.occurredOn,
      kind: parsed.data.kind,
      category: parsed.data.category,
      description: parsed.data.description,
      points: parsed.data.points,
    })
    .select("id")
    .single();

  if (error) {
    return { ok: false, error: "No se pudo registrar la anotación." };
  }

  revalidateGrupo(parsed.data.classId);
  return { ok: true, id: data.id };
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
