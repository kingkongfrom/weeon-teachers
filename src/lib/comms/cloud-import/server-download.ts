import "server-only";

import { inferAttachmentMimeType, isAllowedAttachmentMime } from "@/lib/comms/attachment-mime";
import type { CloudImportRef } from "@/lib/comms/cloud-import/types";

export type DownloadedCloudFile = {
  name: string;
  mimeType: string;
  buffer: Buffer;
  sizeBytes: number;
};

const DROPBOX_FETCH_HEADERS = {
  "User-Agent": "WeeonSchool/1.0 (+https://app.weeon.school)",
  Accept: "*/*",
};

function dropboxDownloadCandidates(url: string): string[] {
  const parsed = new URL(url);
  const host = parsed.hostname.toLowerCase();
  const candidates = new Set<string>([url]);

  if (host === "dl.dropboxusercontent.com" || host.endsWith(".dl.dropboxusercontent.com")) {
    candidates.add(url);
  }

  if (host === "www.dropbox.com" || host === "dropbox.com") {
    const dl1 = new URL(url);
    dl1.searchParams.set("dl", "1");
    candidates.add(dl1.toString());

    const raw = new URL(url);
    raw.searchParams.set("raw", "1");
    candidates.add(raw.toString());
  }

  return [...candidates];
}

function isAllowedDropboxHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return (
    host === "dl.dropboxusercontent.com" ||
    host.endsWith(".dl.dropboxusercontent.com") ||
    host === "www.dropbox.com" ||
    host === "dropbox.com" ||
    host === "content.dropboxapi.com"
  );
}

async function fetchDropboxContent(url: string): Promise<Response> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("invalid_dropbox_url");
  }

  if (!isAllowedDropboxHost(parsed.hostname)) {
    throw new Error("invalid_dropbox_url");
  }

  let lastError: Error | null = null;
  for (const candidate of dropboxDownloadCandidates(url)) {
    try {
      const response = await fetch(candidate, {
        headers: DROPBOX_FETCH_HEADERS,
        redirect: "follow",
      });
      if (response.ok) {
        return response;
      }
      lastError = new Error(`dropbox_http_${response.status}`);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("dropbox_fetch_failed");
    }
  }

  throw lastError ?? new Error("dropbox_fetch_failed");
}

function googleExportTarget(
  mimeType: string,
): { exportMime: string; extension: string } | null {
  switch (mimeType) {
    case "application/vnd.google-apps.document":
      return { exportMime: "application/pdf", extension: ".pdf" };
    case "application/vnd.google-apps.spreadsheet":
      return {
        exportMime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        extension: ".xlsx",
      };
    case "application/vnd.google-apps.presentation":
      return { exportMime: "application/pdf", extension: ".pdf" };
    default:
      return null;
  }
}

function withExtension(name: string, extension: string): string {
  if (name.toLowerCase().endsWith(extension)) return name;
  const dot = name.lastIndexOf(".");
  if (dot > 0) return `${name.slice(0, dot)}${extension}`;
  return `${name}${extension}`;
}

async function downloadDropboxImport(ref: Extract<CloudImportRef, { source: "dropbox" }>) {
  const response = await fetchDropboxContent(ref.url);
  const buffer = Buffer.from(await response.arrayBuffer());
  const mimeType = inferAttachmentMimeType(ref.name, response.headers.get("content-type"));
  return { name: ref.name, mimeType, buffer, sizeBytes: buffer.byteLength };
}

async function downloadGoogleDriveImport(
  ref: Extract<CloudImportRef, { source: "google-drive" }>,
) {
  const exportTarget = googleExportTarget(ref.mimeType);
  let url: string;
  let fileName = ref.name;

  if (exportTarget) {
    url = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(ref.fileId)}/export?mimeType=${encodeURIComponent(exportTarget.exportMime)}`;
    fileName = withExtension(fileName, exportTarget.extension);
  } else {
    url = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(ref.fileId)}?alt=media`;
  }

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${ref.accessToken}` },
  });
  if (!response.ok) {
    throw new Error("google_drive_fetch_failed");
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const mimeType = exportTarget
    ? exportTarget.exportMime
    : inferAttachmentMimeType(fileName, response.headers.get("content-type") ?? ref.mimeType);

  return { name: fileName, mimeType, buffer, sizeBytes: buffer.byteLength };
}

export async function downloadCloudImport(ref: CloudImportRef): Promise<DownloadedCloudFile> {
  const downloaded =
    ref.source === "dropbox"
      ? await downloadDropboxImport(ref)
      : await downloadGoogleDriveImport(ref);

  if (!isAllowedAttachmentMime(downloaded.mimeType)) {
    throw new Error("attachment_type_not_allowed");
  }

  if (downloaded.sizeBytes === 0) {
    throw new Error("dropbox_fetch_failed");
  }

  return downloaded;
}
