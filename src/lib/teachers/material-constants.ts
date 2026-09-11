/** Shared by the materials Server Action and the client dropzone so validation
 * never drifts. Keep in sync with the `class-materials` bucket in
 * `weeon-tenants/supabase/migrations/20260911130000_class_materials.sql`. */

export const MATERIAL_BUCKET = "class-materials";

/** 25 MiB — must match the bucket's `file_size_limit`. */
export const MATERIAL_MAX_BYTES = 26_214_400;

export const MATERIAL_ALLOWED_MIME = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
] as const;

const ALLOWED_MIME = new Set<string>(MATERIAL_ALLOWED_MIME);

const ALLOWED_EXT = new Set([
  "pdf",
  "png",
  "jpg",
  "jpeg",
  "webp",
  "gif",
  "doc",
  "docx",
  "ppt",
  "pptx",
  "xls",
  "xlsx",
  "txt",
]);

/** `accept` attribute for the file input. */
export const MATERIAL_ACCEPT =
  "application/pdf,image/*,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt";

/** Accepts by MIME when the browser provides one, else falls back to the
 * extension (some browsers leave `type` empty). The Storage bucket still
 * enforces the MIME allowlist server-side. */
export function isAllowedMaterialFile(file: {
  type: string;
  name: string;
}): boolean {
  if (file.type && ALLOWED_MIME.has(file.type)) return true;
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return ALLOWED_EXT.has(ext);
}
