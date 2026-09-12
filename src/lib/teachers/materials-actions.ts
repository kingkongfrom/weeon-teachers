"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSessionClient } from "@/lib/supabase/session";
import { loadTeacherGrupo } from "@/lib/dashboard/grupos";
import { getT } from "@/lib/i18n/server";
import {
  MATERIAL_BUCKET,
  MATERIAL_MAX_BYTES,
  isAllowedMaterialFile,
} from "@/lib/teachers/material-constants";

export type MaterialActionResult =
  | { ok: true; id?: string }
  | { ok: false; error: string };

export type MaterialUrlResult =
  | { ok: true; url: string }
  | { ok: false; error: string };

/** Strips directories and unsafe characters; keeps the extension. */
function safeFileName(name: string): string {
  const base = name.replace(/\\/g, "/").split("/").pop() ?? "archivo";
  const cleaned = base
    .replace(/[^\w.\-() ]+/g, "_")
    .replace(/\s+/g, " ")
    .trim();
  return (cleaned || "archivo").slice(0, 120);
}

function isFile(value: FormDataEntryValue | null): value is File {
  return typeof value === "object" && value !== null && "size" in value && "name" in value;
}

/** Uploads a document to a class the teacher manages and records it. */
export async function uploadMaterial(formData: FormData): Promise<MaterialActionResult> {
  const t = await getT();
  const classId = String(formData.get("classId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const topicId = String(formData.get("topicId") ?? "").trim() || null;
  const subjectId = String(formData.get("subjectId") ?? "").trim() || null;
  const file = formData.get("file");

  if (!z.string().uuid().safeParse(classId).success) {
    return { ok: false, error: t.classroom.materialsPanel.errorGeneric };
  }
  if (!title) {
    return { ok: false, error: t.classroom.materialsPanel.errorTitleRequired };
  }
  if (!isFile(file) || file.size === 0) {
    return { ok: false, error: t.classroom.materialsPanel.errorFileRequired };
  }
  if (file.size > MATERIAL_MAX_BYTES) {
    return { ok: false, error: t.classroom.materialsPanel.errorTooLarge };
  }
  if (!isAllowedMaterialFile(file)) {
    return { ok: false, error: t.classroom.materialsPanel.errorType };
  }

  // RLS-scoped access check: null when the teacher does not manage this class.
  const detail = await loadTeacherGrupo(classId);
  if (!detail) {
    return { ok: false, error: t.classroom.materialsPanel.errorGeneric };
  }

  const supabase = await createSessionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const tenantId = user?.app_metadata?.tenant_id ?? user?.user_metadata?.tenant_id;
  if (typeof tenantId !== "string") {
    return { ok: false, error: t.classroom.materialsPanel.errorGeneric };
  }

  const materialId = crypto.randomUUID();
  const fileName = safeFileName(file.name);
  const path = `${tenantId}/${classId}/${materialId}/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from(MATERIAL_BUCKET)
    .upload(path, file, { contentType: file.type || undefined, upsert: false });
  if (uploadError) {
    return { ok: false, error: t.classroom.materialsPanel.errorGeneric };
  }

  const { error: insertError } = await supabase.from("class_materials").insert({
    id: materialId,
    tenant_id: tenantId,
    class_id: classId,
    title,
    description: description || null,
    topic_id: topicId,
    subject_id: subjectId,
    storage_path: path,
    file_name: fileName,
    mime_type: file.type || null,
    size_bytes: file.size,
    published: true,
  });

  if (insertError) {
    // Roll back the orphaned object so storage and the table never diverge.
    await supabase.storage.from(MATERIAL_BUCKET).remove([path]);
    return { ok: false, error: t.classroom.materialsPanel.errorGeneric };
  }

  revalidatePath(`/aula-virtual/${classId}`);
  return { ok: true, id: materialId };
}

/** Removes a material's file and its row. */
export async function deleteMaterial(input: {
  id: string;
  classId: string;
}): Promise<MaterialActionResult> {
  const t = await getT();
  const parsed = z
    .object({ id: z.string().uuid(), classId: z.string().uuid() })
    .safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: t.classroom.materialsPanel.errorDelete };
  }
  const { id, classId } = parsed.data;

  const supabase = await createSessionClient();
  const { data: row } = await supabase
    .from("class_materials")
    .select("storage_path")
    .eq("id", id)
    .eq("class_id", classId)
    .maybeSingle();

  if (row?.storage_path) {
    await supabase.storage.from(MATERIAL_BUCKET).remove([row.storage_path]);
  }

  const { error } = await supabase
    .from("class_materials")
    .delete()
    .eq("id", id)
    .eq("class_id", classId);
  if (error) {
    return { ok: false, error: t.classroom.materialsPanel.errorDelete };
  }

  revalidatePath(`/aula-virtual/${classId}`);
  return { ok: true };
}

/** Short-lived signed URL for downloading a material. */
export async function getMaterialDownloadUrl(input: {
  id: string;
}): Promise<MaterialUrlResult> {
  const t = await getT();
  const parsed = z.object({ id: z.string().uuid() }).safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: t.classroom.materialsPanel.errorDownload };
  }

  const supabase = await createSessionClient();
  const { data: row } = await supabase
    .from("class_materials")
    .select("storage_path, file_name")
    .eq("id", parsed.data.id)
    .maybeSingle();

  if (!row?.storage_path) {
    return { ok: false, error: t.classroom.materialsPanel.errorDownload };
  }

  const { data, error } = await supabase.storage
    .from(MATERIAL_BUCKET)
    .createSignedUrl(row.storage_path, 60, { download: row.file_name });

  if (error || !data?.signedUrl) {
    return { ok: false, error: t.classroom.materialsPanel.errorDownload };
  }
  return { ok: true, url: data.signedUrl };
}

