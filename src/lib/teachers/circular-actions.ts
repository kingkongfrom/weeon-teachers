"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { inferAttachmentMimeType, isAllowedAttachmentMime } from "@/lib/comms/attachment-mime";
import { getCommsActor } from "@/lib/dashboard/comms-session";
import {
  loadTeacherCircularDetail,
  type TeacherCircularDetail,
} from "@/lib/dashboard/teacher-circulars";
import { tRequest } from "@/lib/i18n/server";

export type CircularActionResult = { ok: true; documentId: string } | { ok: false; error: string };

const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024;
const TEACHER_CIRCULARS = "/comunicacion/circulares";

const uuidSchema = z.string().uuid();

/**
 * Detail for one of the teacher's own published circulares, with signed
 * `school-documents` URLs for the reading pane. Teacher RLS restricts this to
 * rows they published.
 */
export async function fetchTeacherCircularDetail(
  documentId: string,
): Promise<TeacherCircularDetail | null> {
  if (!uuidSchema.safeParse(documentId).success) return null;
  return loadTeacherCircularDetail(documentId);
}

const targetSchema = z.object({
  classId: z.string().uuid(),
  kind: z.enum(["parents", "students"]),
});

const publishSchema = z.object({
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().max(400).optional(),
  categoryId: z.string().uuid().nullable(),
  targets: z.array(targetSchema).min(1).max(50),
});

function isUploadFile(value: FormDataEntryValue | null): value is File {
  return typeof value === "object" && value !== null && "size" in value && "name" in value;
}

function mapError(message: string | undefined): string {
  if (!message) return "";
  if (message.includes("not_your_class")) return "Solo puede enviar circulares a sus grupos.";
  if (message.includes("tenant_read_only")) {
    return "El acceso de edición de esta institución está temporalmente deshabilitado.";
  }
  if (message.includes("not_authenticated")) return "Sesión expirada. Vuelva a iniciar sesión.";
  if (message.includes("attachment_required")) return "Adjunte el PDF de la circular.";
  if (message.includes("invalid_category")) return "La categoría no es válida.";
  if (message.includes("Could not find the function") || message.includes("PGRST202")) {
    return "Falta la migración de circulares (20261016030000_teacher_circulares.sql).";
  }
  return "";
}

/**
 * Publish a circular (PDF) from teacher web to the teacher's own groups'
 * parents/students. Uploads the PDF to `<tenant>/<documentId>/<file>` then calls
 * `create_teacher_circular`, which re-validates every target against
 * `teaches_class`.
 */
export async function publishTeacherCircular(formData: FormData): Promise<CircularActionResult> {
  const session = await getCommsActor();
  if (!session) return { ok: false, error: await tRequest("comms.error") };

  let targetsRaw: unknown = [];
  try {
    targetsRaw = JSON.parse(String(formData.get("targets") ?? "[]"));
  } catch {
    return { ok: false, error: "Seleccione al menos un grupo." };
  }

  const parsed = publishSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    categoryId: formData.get("categoryId") ? String(formData.get("categoryId")) : null,
    targets: targetsRaw,
  });
  if (!parsed.success) {
    const missingTitle = parsed.error.issues.some((issue) => issue.path[0] === "title");
    if (missingTitle) return { ok: false, error: "Escriba el título de la circular." };
    return { ok: false, error: "Seleccione al menos un grupo y destinatario." };
  }

  const file = formData.get("file");
  if (!isUploadFile(file) || file.size === 0) {
    return { ok: false, error: "Adjunte el PDF de la circular." };
  }
  if (file.size > MAX_ATTACHMENT_BYTES) {
    return { ok: false, error: "El archivo supera el tamaño máximo permitido." };
  }
  const mimeType = inferAttachmentMimeType(file.name, file.type);
  if (!isAllowedAttachmentMime(mimeType)) {
    return { ok: false, error: "Tipo de archivo no permitido." };
  }

  const documentId = crypto.randomUUID();
  const safeName = file.name.replace(/[^\w.\-]+/g, "_").slice(-120) || "circular.pdf";
  const storagePath = `${session.tenantId}/${documentId}/${crypto.randomUUID()}-${safeName}`;

  const { error: uploadError } = await session.actor.storage
    .from("school-documents")
    .upload(storagePath, file, { contentType: mimeType, upsert: false });
  if (uploadError) {
    return { ok: false, error: "No se pudo subir el archivo. Intente de nuevo." };
  }

  const { error: rpcError } = await session.actor.rpc("create_teacher_circular", {
    p_document_id: documentId,
    p_title: parsed.data.title,
    p_description: parsed.data.description ?? null,
    p_category_id: parsed.data.categoryId,
    p_attachment_name: file.name,
    p_attachment_path: storagePath,
    p_attachment_mime: mimeType,
    p_attachment_size: file.size,
    p_targets: parsed.data.targets,
  });

  if (rpcError) {
    // Best-effort cleanup of the orphaned object.
    await session.actor.storage.from("school-documents").remove([storagePath]);
    const mapped = mapError(rpcError.message);
    return { ok: false, error: mapped || "No se pudo publicar la circular." };
  }

  revalidatePath(TEACHER_CIRCULARS);
  return { ok: true, documentId };
}
