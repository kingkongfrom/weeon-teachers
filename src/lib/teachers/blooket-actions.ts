"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSessionClient } from "@/lib/supabase/session";
import type { BlooketSkipReason, BlooketRow } from "@/lib/assessments/blooket-csv";

/** Placeholder ids: the insert trigger replaces them with the real tenant/user. */
const NIL = "00000000-0000-0000-0000-000000000000";

export type SavedBlooketSet = {
  id: string;
  title: string;
  gradeLevel: string | null;
  questionCount: number;
  updatedAt: string;
  /** True when the set belongs to another teacher (shared with me). */
  shared: boolean;
  sharedByName: string | null;
};

export type BlooketActionResult =
  | { ok: true; id?: string }
  | { ok: false; error: string };

const questionSchema = z.object({
  prompt: z.string(),
  answers: z.array(z.string()),
  correct: z.array(z.number().int()),
  seconds: z.number().int().min(1).max(300),
});

const saveSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(1).max(120),
  gradeLevel: z.string().trim().max(40).nullable().optional(),
  /** The exportable rows, i.e. exactly what the CSV would contain. */
  rows: z.array(questionSchema).min(1),
  /** Reasons the builder could not include, kept for context when reopening. */
  skipped: z
    .array(
      z.object({
        index: z.number().int(),
        prompt: z.string(),
        reason: z.string(),
      }),
    )
    .optional(),
});

function countOf(rows: unknown): number {
  return Array.isArray(rows) ? rows.length : 0;
}

/**
 * Saves (or updates) a Blooket set for the signed-in teacher.
 *
 * Dedupe mirrors the assessments library: the same title and grade for the same
 * owner is updated in place, so pressing Guardar twice does not leave twins.
 */
export async function saveBlooketSet(input: {
  id?: string;
  title: string;
  gradeLevel: string | null;
  rows: BlooketRow[];
  skipped?: Array<{ index: number; prompt: string; reason: BlooketSkipReason }>;
}): Promise<BlooketActionResult> {
  const parsed = saveSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Revisa el título y que haya al menos una pregunta." };
  }

  const supabase = await createSessionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sesión inválida. Inicie sesión de nuevo." };

  const patch = {
    title: parsed.data.title,
    grade_level: parsed.data.gradeLevel ?? null,
    content: { rows: parsed.data.rows, skipped: parsed.data.skipped ?? [] },
    question_count: parsed.data.rows.length,
  };

  // Explicit id: update a set this teacher owns.
  if (parsed.data.id) {
    const { data, error } = await supabase
      .from("exam_library_blooket_sets")
      .update(patch)
      .eq("id", parsed.data.id)
      .select("id");
    if (error) return { ok: false, error: error.message };
    if (!data || data.length === 0) {
      return { ok: false, error: "No tiene permiso para editar este set." };
    }
    revalidatePath("/aula-virtual/blooket");
    return { ok: true, id: parsed.data.id };
  }

  const { data: existing, error: existingError } = await supabase
    .from("exam_library_blooket_sets")
    .select("id")
    .eq("title", patch.title)
    .is("grade_level", patch.grade_level)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existingError) return { ok: false, error: existingError.message };

  if (existing?.id) {
    const { error } = await supabase
      .from("exam_library_blooket_sets")
      .update(patch)
      .eq("id", existing.id);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/aula-virtual/blooket");
    return { ok: true, id: existing.id };
  }

  const { data, error } = await supabase
    .from("exam_library_blooket_sets")
    .insert({ ...patch, tenant_id: NIL, owner_id: NIL })
    .select("id")
    .single();
  if (error || !data) {
    return { ok: false, error: error?.message ?? "No se pudo guardar el set." };
  }
  revalidatePath("/aula-virtual/blooket");
  return { ok: true, id: data.id };
}

/** The teacher's own sets plus the ones shared with them, newest first. */
export async function listBlooketSets(): Promise<{
  ok: boolean;
  error?: string;
  sets: SavedBlooketSet[];
}> {
  const supabase = await createSessionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, sets: [], error: "Sesión inválida." };

  const [{ data: own, error }, { data: shares }] = await Promise.all([
    supabase
      .from("exam_library_blooket_sets")
      .select("id, owner_id, title, grade_level, question_count, updated_at")
      .order("updated_at", { ascending: false }),
    supabase.from("exam_library_blooket_shares").select("set_id, shared_by"),
  ]);

  if (error) return { ok: false, sets: [], error: error.message };

  const sharedBy = new Map(
    (shares ?? []).map((share) => [share.set_id as string, share.shared_by as string]),
  );

  // Names for whomever shared, in one round trip.
  const sharerIds = [...new Set([...sharedBy.values()])];
  const names = new Map<string, string>();
  if (sharerIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, name")
      .in("id", sharerIds);
    for (const profile of profiles ?? []) {
      names.set(profile.id, profile.name ?? "");
    }
  }

  const sets: SavedBlooketSet[] = (own ?? []).map((row) => {
    const isShared = row.owner_id !== user.id;
    return {
      id: row.id,
      title: row.title,
      gradeLevel: row.grade_level,
      questionCount: countOf(
        (row as { question_count?: number }).question_count ?? 0,
      ),
      updatedAt: row.updated_at,
      shared: isShared,
      sharedByName: isShared ? (names.get(sharedBy.get(row.id) ?? "") ?? "") : null,
    };
  });

  return { ok: true, sets };
}

/** Opens one set; the builder loads its rows back into the editor. */
export async function loadBlooketSet(id: string): Promise<{
  ok: boolean;
  error?: string;
  set?: {
    id: string;
    title: string;
    gradeLevel: string | null;
    rows: BlooketRow[];
    ownerId: string;
  };
}> {
  const parsed = z.string().uuid().safeParse(id);
  if (!parsed.success) return { ok: false, error: "Set no válido." };

  const supabase = await createSessionClient();
  const { data, error } = await supabase
    .from("exam_library_blooket_sets")
    .select("id, owner_id, title, grade_level, content")
    .eq("id", parsed.data)
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "No se encontró el set." };

  const content = data.content as { rows?: BlooketRow[] } | null;
  return {
    ok: true,
    set: {
      id: data.id,
      title: data.title,
      gradeLevel: data.grade_level,
      rows: Array.isArray(content?.rows) ? content.rows : [],
      ownerId: data.owner_id,
    },
  };
}

export async function deleteBlooketSet(id: string): Promise<BlooketActionResult> {
  const parsed = z.string().uuid().safeParse(id);
  if (!parsed.success) return { ok: false, error: "Set no válido." };

  const supabase = await createSessionClient();
  const { data, error } = await supabase
    .from("exam_library_blooket_sets")
    .delete()
    .eq("id", parsed.data)
    .select("id");
  if (error) return { ok: false, error: error.message };
  if (!data || data.length === 0) {
    return { ok: false, error: "No tiene permiso para eliminar este set." };
  }
  revalidatePath("/aula-virtual/blooket");
  return { ok: true };
}

export async function shareBlooketSet(input: {
  setId: string;
  teacherId: string;
}): Promise<BlooketActionResult> {
  const parsed = z
    .object({ setId: z.string().uuid(), teacherId: z.string().uuid() })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: "Solicitud no válida." };

  const supabase = await createSessionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const tenantId = user?.app_metadata?.tenant_id ?? user?.user_metadata?.tenant_id;
  if (!user || typeof tenantId !== "string") {
    return { ok: false, error: "Sesión inválida. Inicie sesión de nuevo." };
  }
  if (parsed.data.teacherId === user.id) {
    return { ok: false, error: "No puede compartir consigo mismo." };
  }

  const { error } = await supabase.from("exam_library_blooket_shares").upsert(
    {
      tenant_id: tenantId,
      set_id: parsed.data.setId,
      shared_by: user.id,
      shared_with: parsed.data.teacherId,
    },
    { onConflict: "set_id,shared_with" },
  );
  if (error) return { ok: false, error: error.message };
  revalidatePath("/aula-virtual/blooket");
  return { ok: true };
}

export async function revokeBlooketShare(input: {
  setId: string;
  teacherId: string;
}): Promise<BlooketActionResult> {
  const parsed = z
    .object({ setId: z.string().uuid(), teacherId: z.string().uuid() })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: "Solicitud no válida." };

  const supabase = await createSessionClient();
  const { error } = await supabase
    .from("exam_library_blooket_shares")
    .delete()
    .eq("set_id", parsed.data.setId)
    .eq("shared_with", parsed.data.teacherId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/aula-virtual/blooket");
  return { ok: true };
}

/** Who the set can be shared with, annotated with current access. */
export async function listBlooketShareTargets(input: { setId: string | null }): Promise<{
  ok: boolean;
  teachers: Array<{ id: string; name: string; email: string | null; shared: boolean }>;
}> {
  const parsed = z.object({ setId: z.string().uuid().nullable() }).safeParse(input);
  if (!parsed.success) return { ok: false, teachers: [] };

  const supabase = await createSessionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const tenantId = user?.app_metadata?.tenant_id ?? user?.user_metadata?.tenant_id;
  if (!user || typeof tenantId !== "string") return { ok: false, teachers: [] };

  const [{ data: profiles, error }, { data: shares }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, name, email")
      .eq("tenant_id", tenantId)
      .eq("role", "teacher")
      .order("name"),
    parsed.data.setId
      ? supabase
          .from("exam_library_blooket_shares")
          .select("shared_with")
          .eq("set_id", parsed.data.setId)
      : Promise.resolve({ data: [] as Array<{ shared_with: string }> }),
  ]);
  if (error) return { ok: false, teachers: [] };

  const granted = new Set((shares ?? []).map((share) => share.shared_with as string));
  return {
    ok: true,
    teachers: (profiles ?? [])
      .filter((profile) => profile.id !== user.id)
      .map((profile) => ({
        id: profile.id,
        name: profile.name ?? "",
        email: profile.email ?? null,
        shared: granted.has(profile.id),
      })),
  };
}
