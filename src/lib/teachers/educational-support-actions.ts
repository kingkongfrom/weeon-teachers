"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type {
  ClassEducationalSupportFlags,
  EducationalSupport,
  EducationalSupportCategory,
  EducationalSupportRegistration,
  EducationalSupportRegistrationInput,
  EducationalSupportSubjectScope,
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
  subject_scope: string;
  subject_ids: string[] | null;
  subject_labels: string[] | null;
  created_at: string;
};

function mapSupport(row: SupportRow): EducationalSupport {
  return {
    id: row.id,
    studentId: row.student_id,
    category: row.category as EducationalSupportCategory,
    title: row.title,
    description: row.description,
    effectiveFrom: row.effective_from,
    effectiveUntil: row.effective_until,
    active: row.active,
    subjectScope: row.subject_scope as EducationalSupportSubjectScope,
    subjectIds: row.subject_ids ?? [],
    subjectLabels: row.subject_labels ?? [],
    createdAt: row.created_at,
  };
}

export async function fetchStudentEducationalSupports(
  studentId: string,
  options?: { subjectId?: string | null; classId?: string },
): Promise<{ ok: true; supports: EducationalSupport[] } | { ok: false; error: string }> {
  const parsed = z.string().uuid().safeParse(studentId);
  if (!parsed.success) {
    return { ok: false, error: "Estudiante no válido." };
  }

  const supabase = await createSessionClient();
  let subjectId = options?.subjectId ?? null;
  if (!subjectId && options?.classId) {
    const { data: cls } = await supabase
      .from("classes")
      .select("subject_id")
      .eq("id", options.classId)
      .maybeSingle();
    subjectId = (cls?.subject_id as string | null) ?? null;
  }

  const { data, error } = await supabase.rpc("list_student_educational_supports", {
    p_student_id: parsed.data,
    p_subject_id: subjectId,
  });

  if (error) {
    return { ok: false, error: "No se pudieron cargar los apoyos educativos." };
  }

  return { ok: true, supports: ((data ?? []) as SupportRow[]).map(mapSupport) };
}

const studentIdSchema = z.object({
  studentId: z.string().uuid(),
  classId: z.string().uuid().optional(),
});

type RegistrationRow = {
  id: string;
  student_id: string;
  class_id: string;
  subject_id: string | null;
  period_key: string;
  period_label: string;
  functioning_notes: string | null;
  applied_personal: boolean;
  applied_curricular: boolean;
  applied_access: boolean;
  applied_methodology: boolean;
  applied_evaluation: boolean;
  results_notes: string;
  observations: string | null;
  submitted_at: string;
  updated_at: string;
  is_current_period: boolean;
};

type FlagRow = {
  student_id: string;
  active_count: number;
  needs_review: boolean;
  needs_period_registration: boolean;
};

function mapRegistration(row: RegistrationRow): EducationalSupportRegistration {
  return {
    id: row.id,
    studentId: row.student_id,
    classId: row.class_id,
    subjectId: row.subject_id,
    periodKey: row.period_key,
    periodLabel: row.period_label,
    functioningNotes: row.functioning_notes,
    appliedPersonal: row.applied_personal,
    appliedCurricular: row.applied_curricular,
    appliedAccess: row.applied_access,
    appliedMethodology: row.applied_methodology,
    appliedEvaluation: row.applied_evaluation,
    resultsNotes: row.results_notes,
    observations: row.observations,
    submittedAt: row.submitted_at,
    updatedAt: row.updated_at,
    isCurrentPeriod: row.is_current_period,
  };
}

export async function fetchClassEducationalSupportFlags(input: {
  classId: string;
  subjectId?: string | null;
  conduct?: boolean;
}): Promise<{ ok: true; flags: ClassEducationalSupportFlags } | { ok: false; error: string }> {
  const classParsed = z.string().uuid().safeParse(input.classId);
  if (!classParsed.success) {
    return { ok: false, error: "Grupo no válido." };
  }

  const supabase = await createSessionClient();
  const { data, error } = await supabase.rpc("list_class_educational_support_flags", {
    p_class_id: classParsed.data,
    p_subject_id: input.conduct ? null : (input.subjectId ?? null),
    p_conduct: input.conduct ?? false,
  });

  if (error) {
    return { ok: false, error: "No se pudieron cargar los apoyos educativos." };
  }

  const flags: ClassEducationalSupportFlags = {};
  for (const row of (data ?? []) as FlagRow[]) {
    flags[row.student_id] = {
      activeCount: row.active_count,
      needsReview: row.needs_review,
      needsPeriodRegistration: row.needs_period_registration,
    };
  }
  return { ok: true, flags };
}

export async function fetchEducationalSupportRegistration(input: {
  studentId: string;
  classId: string;
  subjectId?: string | null;
}): Promise<
  { ok: true; registration: EducationalSupportRegistration | null } | { ok: false; error: string }
> {
  const parsed = z
    .object({
      studentId: z.string().uuid(),
      classId: z.string().uuid(),
      subjectId: z.string().uuid().nullable().optional(),
    })
    .safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Solicitud no válida." };
  }

  const supabase = await createSessionClient();
  const { data, error } = await supabase.rpc("get_educational_support_registration", {
    p_student_id: parsed.data.studentId,
    p_class_id: parsed.data.classId,
    p_subject_id: parsed.data.subjectId ?? null,
  });

  if (error) {
    return { ok: false, error: "No se pudo cargar el registro de apoyos." };
  }

  const row = ((data ?? []) as RegistrationRow[])[0];
  return { ok: true, registration: row ? mapRegistration(row) : null };
}

const registrationSchema = z.object({
  studentId: z.string().uuid(),
  classId: z.string().uuid(),
  subjectId: z.string().uuid().nullable().optional(),
  functioningNotes: z.string().max(2000).nullable().optional(),
  appliedPersonal: z.boolean(),
  appliedCurricular: z.boolean(),
  appliedAccess: z.boolean(),
  appliedMethodology: z.boolean(),
  appliedEvaluation: z.boolean(),
  resultsNotes: z.string().trim().min(3).max(2000),
  observations: z.string().max(2000).nullable().optional(),
});

export async function saveEducationalSupportRegistration(
  input: EducationalSupportRegistrationInput,
): Promise<EducationalSupportActionResult & { id?: string }> {
  const parsed = registrationSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Revise el registro de apoyos." };
  }

  const supabase = await createSessionClient();
  const { data, error } = await supabase.rpc("save_educational_support_registration", {
    p_student_id: parsed.data.studentId,
    p_class_id: parsed.data.classId,
    p_subject_id: parsed.data.subjectId ?? null,
    p_functioning_notes: parsed.data.functioningNotes ?? null,
    p_applied_personal: parsed.data.appliedPersonal,
    p_applied_curricular: parsed.data.appliedCurricular,
    p_applied_access: parsed.data.appliedAccess,
    p_applied_methodology: parsed.data.appliedMethodology,
    p_applied_evaluation: parsed.data.appliedEvaluation,
    p_results_notes: parsed.data.resultsNotes,
    p_observations: parsed.data.observations ?? null,
  });

  if (error) {
    if (error.message.includes("results_required")) {
      return { ok: false, error: "Los resultados son obligatorios." };
    }
    if (error.message.includes("outside_school_period")) {
      return { ok: false, error: "No hay un periodo lectivo activo para registrar apoyos." };
    }
    return { ok: false, error: "No se pudo guardar el registro de apoyos." };
  }

  revalidatePath(`/grupos/${parsed.data.classId}`);
  revalidatePath(`/estudiantes/${parsed.data.studentId}`);
  return { ok: true, id: data as string };
}

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
