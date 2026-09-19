/** Allowed circulares / message attachment types (admin upload + mobile open). */
export const MESSAGE_ATTACHMENT_ACCEPT =
  ".pdf,.jpg,.jpeg,.png,.webp,.gif,.heic,.doc,.docx,.xls,.xlsx,.txt,application/pdf,image/*";

const EXTENSION_MIME: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  heic: "image/heic",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  txt: "text/plain",
};

const ALLOWED_MIMES = new Set(Object.values(EXTENSION_MIME));

export function inferAttachmentMimeType(fileName: string, reportedType?: string | null): string {
  const trimmed = reportedType?.split(";")[0]?.trim().toLowerCase() ?? "";
  if (trimmed && ALLOWED_MIMES.has(trimmed)) return trimmed;

  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  return EXTENSION_MIME[ext] ?? "application/octet-stream";
}

export function isAllowedAttachmentMime(mimeType: string): boolean {
  const base = mimeType.split(";")[0]?.trim().toLowerCase() ?? "";
  if (ALLOWED_MIMES.has(base)) return true;
  if (base.startsWith("image/")) {
    return ["image/jpeg", "image/png", "image/webp", "image/gif", "image/heic"].includes(base);
  }
  return false;
}

export function attachmentKind(
  mimeType: string | null | undefined,
  fileName: string,
): "image" | "pdf" | "document" | "other" {
  const mime = inferAttachmentMimeType(fileName, mimeType);
  if (mime === "application/pdf") return "pdf";
  if (mime.startsWith("image/")) return "image";
  if (
    mime.includes("word") ||
    mime.includes("excel") ||
    mime.includes("spreadsheet") ||
    mime === "text/plain"
  ) {
    return "document";
  }
  return "other";
}
