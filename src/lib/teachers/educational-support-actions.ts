"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type {
  EducationalSupport,
  EducationalSupportCategory,
} from "@/lib/educational-supports/model";
import { createSessionClient } from "@/lib/supabase/session";

export type EducationalSupportActionResult = { ok: true } | { ok: false; error: string };

type SupportRow = {
  id: string;
  student_id: string;
  category: string;
  title: string;
  description: string;
  effective_from: string | null;
  effective_until: string | null;
  active: boolean;
  created_at: string;
};

export async function fetchStudentEducationalSupports(
  studentId: string,
): Promise<{ ok: true; supports: EducationalSupport[] } | { ok: false; error: string }> {
  const parsed = z.string().uuid().safeParse(studentId);
  if (!parsed.success) {
    return { ok: false, error: "Estudiante no válido." };
  }

  const supabase = await createSessionClient();
  const { data, error } = await supabase.rpc("list_student_educational_supports", {
    p_student_id: parsed.data,
  });

  if (error) {
    return { ok: false, error: "No se pudieron cargar los apoyos educativos." };
  }

  const supports = ((data ?? []) as SupportRow[]).map((row) => ({
    id: row.id,
    studentId: row.student_id,
    category: row.category as EducationalSupportCategory,
    title: row.title,
    description: row.description,
    effectiveFrom: row.effective_from,
    effectiveUntil: row.effective_until,
    active: row.active,
    createdAt: row.created_at,
  }));

  return { ok: true, supports };
}

const studentIdSchema = z.object({
  studentId: z.string().uuid(),
  classId: z.string().uuid().optional(),
});

export async function acknowledgeStudentEducationalSupports(input: {
  studentId: string;
  classId?: string;
}): Promise<EducationalSupportActionResult> {
  const parsed = studentIdSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Solicitud no válida." };
  }

  const supabase = await createSessionClient();
  const { error } = await supabase.rpc("acknowledge_student_educational_supports", {
    p_student_id: parsed.data.studentId,
  });

  if (error) {
    return { ok: false, error: "No se pudo confirmar la lectura de los apoyos educativos." };
  }

  if (parsed.data.classId) {
    revalidatePath(`/grupos/${parsed.data.classId}`);
  }
  revalidatePath(`/estudiantes/${parsed.data.studentId}`);
  return { ok: true };
}
