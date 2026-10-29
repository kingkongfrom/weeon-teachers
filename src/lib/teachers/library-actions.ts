"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSessionClient } from "@/lib/supabase/session";
import {
  computePointsTotal,
  type AssessmentContent,
  type RichTextDoc,
} from "@/lib/assessments/model";
import { assessmentFromLibrary, canPullLibraryUpdate } from "@/lib/assessments/library";
import { stripImageUrls } from "@/lib/assessments/rich-text-images";
import { resolveRubroForKind } from "@/lib/dashboard/rubro-routing";

export type LibraryActionResult =
  | {
      ok: true;
      id?: string;
      /** Present when a collection was created, so the dialog can select it. */
      collection?: { id: string; name: string; color: string | null; position: number };
    }
  | { ok: false; error: string };

const saveSchema = z.object({
  /** Existing item to overwrite; omitted creates a new one. */
  id: z.string().uuid().optional(),
  title: z.string().trim().max(120),
  kind: z.enum(["homework", "exam"]),
  subjectId: z.string().uuid().nullable().optional(),
  gradeLevel: z.string().trim().max(20).nullable().optional(),
  collectionId: z.string().uuid().nullable().optional(),
  instructions: z.unknown().nullable().optional(),
  content: z.unknown(),
});

/**
 * Saves the current definition into the teacher's library ("Guardar en mis
 * evaluaciones"), creating an item or updating the one it came from.
 *
 * Points are recomputed from the questions, the same way the assessment editor
 * does, so a library item can never disagree with its own content.
 */
export async function saveAssessmentToLibrary(input: {
  id?: string;
  title: string;
  kind: "homework" | "exam";
  subjectId?: string | null;
  gradeLevel?: string | null;
  collectionId?: string | null;
  instructions?: RichTextDoc | null;
  content: AssessmentContent;
}): Promise<LibraryActionResult> {
  const parsed = saveSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "La evaluación no tiene un formato válido." };
  }
  const { id, title, kind, subjectId, gradeLevel, collectionId, instructions, content } =
    parsed.data;

  const safeContent = content as AssessmentContent;
  const pointsTotal = computePointsTotal({
    questions: Array.isArray(safeContent?.questions) ? safeContent.questions : [],
  });
  // Images are uploaded per assessment; keeping them in the library would point
  // a reused copy at another teacher's storage objects.
  const safeInstructions = stripImageUrls(
    (instructions as RichTextDoc | null | undefined) ?? null,
  );

  const supabase = await createSessionClient();
  const patch = {
    title: title || "Evaluación sin título",
    kind,
    subject_id: subjectId ?? null,
    grade_level: gradeLevel ?? null,
    collection_id: collectionId ?? null,
    instructions: safeInstructions,
    content: { questions: Array.isArray(safeContent?.questions) ? safeContent.questions : [] },
    points_total: pointsTotal,
  };

  if (id) {
    const { data, error } = await supabase
      .from("exam_library_items")
      .update(patch)
      .eq("id", id)
      .select("id");
    if (error) return { ok: false, error: error.message };
    if (!data || data.length === 0) {
      return { ok: false, error: "No tiene permiso para editar esta evaluación." };
    }
    revalidatePath("/aula-virtual/mis-evaluaciones");
    return { ok: true, id };
  }

  // tenant_id is injected by the `exam_library_set_owner` trigger, so a forged
  // tenant or owner can never be written from the client.
  //
  // Duplicate guard: saving the same definition twice used to create two
  // identical cards. An item with the same title and kind already in the target
  // collection is treated as the same evaluation and updated in place, which is
  // what "Guardar en mis evaluaciones" is expected to do when nothing changed.
  const { data: existing, error: existingError } = await supabase
    .from("exam_library_items")
    .select("id")
    .eq("title", patch.title)
    .eq("kind", patch.kind)
    .eq("archived", false)
    .is("collection_id", patch.collection_id)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existingError) return { ok: false, error: existingError.message };

  if (existing?.id) {
    const { error: updateError } = await supabase
      .from("exam_library_items")
      .update(patch)
      .eq("id", existing.id);
    if (updateError) return { ok: false, error: updateError.message };
    revalidatePath("/aula-virtual/mis-evaluaciones");
    return { ok: true, id: existing.id };
  }

  const { data, error } = await supabase
    .from("exam_library_items")
    .insert({
      ...patch,
      tenant_id: "00000000-0000-0000-0000-000000000000",
      owner_id: "00000000-0000-0000-0000-000000000000",
    })
    .select("id")
    .single();
  if (error || !data) {
    return { ok: false, error: error?.message ?? "No se pudo guardar la evaluación." };
  }
  revalidatePath("/aula-virtual/mis-evaluaciones");
  return { ok: true, id: data.id };
}

/** Archives (or restores) an item. Archived items never appear in the picker. */
export async function setLibraryItemArchived(input: {
  id: string;
  archived: boolean;
}): Promise<LibraryActionResult> {
  const parsed = z
    .object({ id: z.string().uuid(), archived: z.boolean() })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: "Solicitud no válida." };

  const supabase = await createSessionClient();
  const { data, error } = await supabase
    .from("exam_library_items")
    .update({ archived: parsed.data.archived })
    .eq("id", parsed.data.id)
    .select("id");
  if (error) return { ok: false, error: error.message };
  if (!data || data.length === 0) {
    return { ok: false, error: "No tiene permiso para editar esta evaluación." };
  }
  revalidatePath("/aula-virtual/mis-evaluaciones");
  return { ok: true };
}

/** Deletes an item. Assigned copies survive (library_item_id set to null). */
export async function deleteLibraryItem(input: { id: string }): Promise<LibraryActionResult> {
  const parsed = z.object({ id: z.string().uuid() }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Solicitud no válida." };

  const supabase = await createSessionClient();
  const { error } = await supabase
    .from("exam_library_items")
    .delete()
    .eq("id", parsed.data.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/aula-virtual/mis-evaluaciones");
  return { ok: true };
}

/* ── Collections ─────────────────────────────────────────────────────────── */

export async function createLibraryCollection(input: {
  name: string;
}): Promise<LibraryActionResult> {
  const parsed = z
    .object({ name: z.string().trim().min(1).max(80) })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: "El nombre de la colección es obligatorio." };

  const supabase = await createSessionClient();

  // Append after the last collection. The count query is checked: if it were
  // ignored (as it used to be), every collection would get position 0 and the
  // list order would be arbitrary.
  const { count, error: countError } = await supabase
    .from("exam_library_collections")
    .select("id", { count: "exact", head: true });
  if (countError) {
    return { ok: false, error: countError.message };
  }

  const { data, error } = await supabase
    .from("exam_library_collections")
    .insert({
      name: parsed.data.name,
      position: count ?? 0,
      tenant_id: "00000000-0000-0000-0000-000000000000",
      owner_id: "00000000-0000-0000-0000-000000000000",
    })
    .select("id, name, color, position")
    .single();
  if (error || !data) {
    return { ok: false, error: error?.message ?? "No se pudo crear la colección." };
  }
  revalidatePath("/aula-virtual/mis-evaluaciones");
  return { ok: true, id: data.id, collection: data };
}

export async function renameLibraryCollection(input: {
  id: string;
  name: string;
}): Promise<LibraryActionResult> {
  const parsed = z
    .object({ id: z.string().uuid(), name: z.string().trim().min(1).max(80) })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: "El nombre de la colección es obligatorio." };

  const supabase = await createSessionClient();
  const { error } = await supabase
    .from("exam_library_collections")
    .update({ name: parsed.data.name })
    .eq("id", parsed.data.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/aula-virtual/mis-evaluaciones");
  return { ok: true };
}

/** Deletes a folder. Items inside are kept and become unfiled (`set null`). */
export async function deleteLibraryCollection(input: {
  id: string;
}): Promise<LibraryActionResult> {
  const parsed = z.object({ id: z.string().uuid() }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Solicitud no válida." };

  const supabase = await createSessionClient();
  const { error } = await supabase
    .from("exam_library_collections")
    .delete()
    .eq("id", parsed.data.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/aula-virtual/mis-evaluaciones");
  return { ok: true };
}

/** Moves an item into a collection (or out of every collection). */
export async function moveLibraryItem(input: {
  id: string;
  collectionId: string | null;
}): Promise<LibraryActionResult> {
  const parsed = z
    .object({ id: z.string().uuid(), collectionId: z.string().uuid().nullable() })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: "Solicitud no válida." };

  const supabase = await createSessionClient();
  const { data, error } = await supabase
    .from("exam_library_items")
    .update({ collection_id: parsed.data.collectionId })
    .eq("id", parsed.data.id)
    .select("id");
  if (error) return { ok: false, error: error.message };
  if (!data || data.length === 0) {
    return { ok: false, error: "No tiene permiso para editar esta evaluación." };
  }
  revalidatePath("/aula-virtual/mis-evaluaciones");
  return { ok: true };
}

/* ── Sharing ─────────────────────────────────────────────────────────────── */

/** Shares one item with a teacher of the same school (idempotent). */
export async function shareLibraryItem(input: {
  itemId: string;
  teacherId: string;
}): Promise<LibraryActionResult> {
  const parsed = z
    .object({ itemId: z.string().uuid(), teacherId: z.string().uuid() })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: "Solicitud no válida." };

  const supabase = await createSessionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const tenantId = user?.app_metadata?.tenant_id ?? user?.user_metadata?.tenant_id;
  if (typeof tenantId !== "string" || !user) {
    return { ok: false, error: "Sesión inválida. Inicie sesión de nuevo." };
  }
  if (parsed.data.teacherId === user.id) {
    return { ok: false, error: "No puede compartir consigo mismo." };
  }

  const { error } = await supabase.from("exam_library_shares").upsert(
    {
      tenant_id: tenantId,
      item_id: parsed.data.itemId,
      shared_by: user.id,
      shared_with: parsed.data.teacherId,
    },
    { onConflict: "item_id,shared_with" },
  );
  if (error) return { ok: false, error: error.message };
  revalidatePath("/aula-virtual/mis-evaluaciones");
  return { ok: true };
}

/** Revokes a share (the sharer can always remove; the recipient can leave). */
export async function revokeLibraryShare(input: {
  itemId: string;
  teacherId: string;
}): Promise<LibraryActionResult> {
  const parsed = z
    .object({ itemId: z.string().uuid(), teacherId: z.string().uuid() })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: "Solicitud no válida." };

  const supabase = await createSessionClient();
  const { error } = await supabase
    .from("exam_library_shares")
    .delete()
    .eq("item_id", parsed.data.itemId)
    .eq("shared_with", parsed.data.teacherId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/aula-virtual/mis-evaluaciones");
  return { ok: true };
}

/* ── Using an item in a class ────────────────────────────────────────────── */

const useSchema = z.object({
  itemId: z.string().uuid(),
  classId: z.string().uuid(),
});

/**
 * "Usar en esta clase": copies the item into a new **draft** assessment for that
 * group. The copy is a snapshot (§3.4/§3.7 of the design), so editing the item
 * later never rewrites a group that may already be taking it.
 *
 * Recipients of a shared item get their own copy — sharing grants reading, not
 * authorship inside someone else's library.
 */
export async function useLibraryItemInClass(input: {
  itemId: string;
  classId: string;
}): Promise<LibraryActionResult> {
  const parsed = useSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Solicitud no válida." };

  const supabase = await createSessionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const tenantId = user?.app_metadata?.tenant_id ?? user?.user_metadata?.tenant_id;
  if (typeof tenantId !== "string") {
    return { ok: false, error: "Sesión inválida. Inicie sesión de nuevo." };
  }

  const { data: canTeach } = await supabase.rpc("teaches_class", {
    p_class_id: parsed.data.classId,
  });
  if (canTeach !== true) {
    return { ok: false, error: "No puede crear evaluaciones en este grupo." };
  }

  // RLS decides whether the item is mine or shared with me; either way the
  // content may be read.
  const { data: item, error: itemError } = await supabase
    .from("exam_library_items")
    .select("id, title, kind, subject_id, instructions, content, points_total")
    .eq("id", parsed.data.itemId)
    .maybeSingle();
  if (itemError || !item) {
    return { ok: false, error: "La evaluación ya no está disponible." };
  }

  // The class's subject is the fallback for an item authored without one.
  let classSubjectId: string | null = null;
  const { data: lesson } = await supabase
    .from("class_lessons")
    .select("subject_id")
    .eq("class_id", parsed.data.classId)
    .not("subject_id", "is", null)
    .limit(1)
    .maybeSingle();
  classSubjectId = (lesson?.subject_id as string | null) ?? null;

  const { count } = await supabase
    .from("assessments")
    .select("id", { count: "exact", head: true })
    .eq("class_id", parsed.data.classId);

  const draft = assessmentFromLibrary({
    itemId: item.id,
    source: {
      title: item.title ?? "",
      kind: item.kind === "exam" ? "exam" : "homework",
      subjectId: item.subject_id,
      instructions: (item.instructions ?? null) as RichTextDoc | null,
      content: ((item.content ?? { questions: [] }) as AssessmentContent) ?? {
        questions: [],
      },
      pointsTotal: Number(item.points_total ?? 0),
    },
    classId: parsed.data.classId,
    fallbackSubjectId: classSubjectId,
    position: count ?? 0,
  });

  const { data: created, error: createError } = await supabase
    .from("assessments")
    .insert({
      tenant_id: tenantId,
      class_id: draft.classId,
      subject_id: draft.subjectId,
      title: draft.title || "Evaluación sin título",
      kind: draft.kind,
      instructions: draft.instructions,
      content: draft.content,
      points_total: draft.pointsTotal,
      due_at: draft.dueAt,
      published: draft.published,
      position: draft.position,
      library_item_id: draft.libraryItemId,
    })
    .select("id")
    .single();

  if (createError || !created) {
    return { ok: false, error: "No se pudo crear la evaluación en el grupo." };
  }

  revalidatePath(`/aula-virtual/${parsed.data.classId}`);
  revalidatePath("/aula-virtual/mis-evaluaciones");
  return { ok: true, id: created.id };
}

/**
 * Pulls the library definition into an existing draft assessment that has no
 * submissions yet. Refused for anything published or already answered, so a
 * group's questions never change under it.
 */
export async function updateAssessmentFromLibrary(input: {
  assessmentId: string;
  classId: string;
}): Promise<LibraryActionResult> {
  const parsed = z
    .object({ assessmentId: z.string().uuid(), classId: z.string().uuid() })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: "Solicitud no válida." };

  const supabase = await createSessionClient();
  const { data: assessment } = await supabase
    .from("assessments")
    .select("id, published, library_item_id")
    .eq("id", parsed.data.assessmentId)
    .maybeSingle();
  if (!assessment?.library_item_id) {
    return { ok: false, error: "Esta evaluación no viene de Mis evaluaciones." };
  }

  const [{ count: submissions }, { data: item }] = await Promise.all([
    supabase
      .from("submissions")
      .select("id", { count: "exact", head: true })
      .eq("assessment_id", parsed.data.assessmentId)
      .in("state", ["submitted", "returned"]),
    supabase
      .from("exam_library_items")
      .select("title, kind, instructions, content, points_total")
      .eq("id", assessment.library_item_id)
      .maybeSingle(),
  ]);

  if (!item) return { ok: false, error: "La evaluación original ya no existe." };
  if (
    !canPullLibraryUpdate({
      published: Boolean(assessment.published),
      submissionCount: submissions ?? 0,
    })
  ) {
    return {
      ok: false,
      error:
        "No se puede actualizar: la evaluación ya fue publicada o tiene entregas. Duplíquela desde Mis evaluaciones.",
    };
  }

  const content = (item.content ?? { questions: [] }) as AssessmentContent;
  const { error } = await supabase
    .from("assessments")
    .update({
      title: item.title || "Evaluación sin título",
      kind: item.kind === "exam" ? "exam" : "homework",
      instructions: (item.instructions ?? null) as RichTextDoc | null,
      content: { questions: Array.isArray(content.questions) ? content.questions : [] },
      points_total: Number(item.points_total ?? 0),
    })
    .eq("id", parsed.data.assessmentId);

  if (error) return { ok: false, error: "No se pudo actualizar la evaluación." };

  revalidatePath(`/aula-virtual/${parsed.data.classId}`);
  return { ok: true };
}

/**
 * Copies a shared item into the recipient's own library, so they can edit it
 * without touching the sharer's original (and keep it if sharing is revoked).
 */
export async function duplicateSharedItemToMine(input: {
  itemId: string;
}): Promise<LibraryActionResult> {
  const parsed = z.object({ itemId: z.string().uuid() }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Solicitud no válida." };

  const supabase = await createSessionClient();
  const { data: item } = await supabase
    .from("exam_library_items")
    .select("title, kind, subject_id, grade_level, instructions, content, points_total")
    .eq("id", parsed.data.itemId)
    .maybeSingle();
  if (!item) return { ok: false, error: "La evaluación ya no está disponible." };

  const { data, error } = await supabase
    .from("exam_library_items")
    .insert({
      tenant_id: "00000000-0000-0000-0000-000000000000",
      owner_id: "00000000-0000-0000-0000-000000000000",
      title: `${item.title || "Evaluación"} (copia)`,
      kind: item.kind === "exam" ? "exam" : "homework",
      subject_id: item.subject_id,
      grade_level: item.grade_level,
      instructions: item.instructions,
      content: item.content,
      points_total: Number(item.points_total ?? 0),
    })
    .select("id")
    .single();
  if (error || !data) {
    return { ok: false, error: "No se pudo duplicar la evaluación." };
  }
  revalidatePath("/aula-virtual/mis-evaluaciones");
  return { ok: true, id: data.id };
}

/** Suggested destination rubro for a kind, used to tell the teacher where the
 * gradeboard column will land once they publish. */
export async function suggestedRubroForClass(input: {
  classId: string;
  subjectId: string | null;
  kind: "homework" | "exam";
}): Promise<{ id: string; name: string; peso: number } | null> {
  const parsed = z
    .object({
      classId: z.string().uuid(),
      subjectId: z.string().uuid().nullable(),
      kind: z.enum(["homework", "exam"]),
    })
    .safeParse(input);
  if (!parsed.success) return null;

  const supabase = await createSessionClient();
  const build = (withKind: boolean) => {
    let query = supabase
      .from("grade_rubros")
      .select(
        withKind
          ? "id, name, peso, position, archived, default_kind"
          : "id, name, peso, position, archived",
      )
      .eq("class_id", parsed.data.classId)
      .eq("archived", false)
      .order("position");
    if (parsed.data.subjectId) query = query.eq("subject_id", parsed.data.subjectId);
    return query;
  };

  // The routing tag is optional schema; never let it break the suggestion.
  let response = await build(true);
  if (response.error) response = (await build(false)) as typeof response;

  const data = response.data as
    | Array<{
        id: string;
        name: string | null;
        peso: number;
        position: number;
        archived: boolean;
        default_kind?: "homework" | "exam" | null;
      }>
    | null;
  const rubric = (data ?? []).map((rubro) => ({
    id: rubro.id as string,
    name: (rubro.name as string) ?? "",
    position: (rubro.position as number) ?? 0,
    archived: Boolean(rubro.archived),
    defaultKind: (rubro.default_kind as "homework" | "exam" | null) ?? null,
  }));
  const match = resolveRubroForKind(rubric, parsed.data.kind);
  if (!match) return null;
  const peso = (data ?? []).find((rubro) => rubro.id === match.id)?.peso;
  return { id: match.id, name: match.name, peso: Number(peso ?? 0) };
}
