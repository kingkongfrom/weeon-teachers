import { inferAttachmentMimeType, isAllowedAttachmentMime } from "@/lib/comms/attachment-mime";
import type { GoogleDriveCloudImport } from "@/lib/comms/cloud-import/types";

const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024;

export async function fetchGoogleDriveImportsAsFiles(
  refs: GoogleDriveCloudImport[],
): Promise<File[]> {
  const files: File[] = [];

  for (const ref of refs) {
    const response = await fetch("/api/comms/google-drive-import", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(ref),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      throw new Error(payload?.error ?? "google_drive_fetch_failed");
    }

    const blob = await response.blob();
    const headerName = response.headers.get("X-File-Name");
    const fileName = headerName ? decodeURIComponent(headerName) : ref.name;
    const mimeType = inferAttachmentMimeType(
      fileName,
      response.headers.get("Content-Type") ?? ref.mimeType,
    );

    if (!isAllowedAttachmentMime(mimeType)) {
      throw new Error("attachment_type_not_allowed");
    }
    if (blob.size > MAX_ATTACHMENT_BYTES) {
      throw new Error("attachment_too_large");
    }
    if (blob.size === 0) {
      throw new Error("google_drive_fetch_failed");
    }

    files.push(new File([blob], fileName, { type: mimeType }));
  }

  return files;
}
