import { inferAttachmentMimeType, isAllowedAttachmentMime } from "@/lib/comms/attachment-mime";
import {
  DROPBOX_APP_KEY,
  isDropboxConfigured,
} from "@/lib/comms/cloud-import/config";
import { loadScript } from "@/lib/comms/cloud-import/load-script";

const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024;

type DropboxChooserFile = {
  name: string;
  link: string;
  bytes?: number;
  isDir?: boolean;
};

type DropboxChooseOptions = {
  success: (files: DropboxChooserFile[]) => void;
  cancel?: () => void;
  linkType: "direct" | "preview";
  multiselect: boolean;
  extensions?: string[];
};

declare global {
  interface Window {
    Dropbox?: {
      choose: (options: DropboxChooseOptions) => void;
    };
  }
}

function isDirectDropboxLink(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host === "dl.dropboxusercontent.com" || host.endsWith(".dl.dropboxusercontent.com");
  } catch {
    return false;
  }
}

function fileFromBlob(name: string, blob: Blob, reportedType: string | null): File {
  const mimeType = inferAttachmentMimeType(name, reportedType || blob.type);
  if (!isAllowedAttachmentMime(mimeType)) {
    throw new Error("attachment_type_not_allowed");
  }
  if (blob.size > MAX_ATTACHMENT_BYTES) {
    throw new Error("attachment_too_large");
  }
  if (blob.size === 0) {
    throw new Error("dropbox_empty_file");
  }
  return new File([blob], name, { type: mimeType });
}

async function fetchDirectInBrowser(link: string, name: string): Promise<File> {
  const response = await fetch(link);
  if (!response.ok) {
    throw new Error(`dropbox_http_${response.status}`);
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("text/html")) {
    throw new Error("dropbox_fetch_failed");
  }

  const blob = await response.blob();
  return fileFromBlob(name, blob, contentType);
}

async function fetchViaServer(link: string, name: string): Promise<File> {
  const response = await fetch("/api/comms/dropbox-import", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: link, name }),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? "dropbox_fetch_failed");
  }

  const blob = await response.blob();
  const headerName = response.headers.get("X-File-Name");
  const fileName = headerName ? decodeURIComponent(headerName) : name;
  return fileFromBlob(fileName, blob, response.headers.get("Content-Type"));
}

async function chooserFileToLocal(file: DropboxChooserFile): Promise<File> {
  if (file.isDir) {
    throw new Error("dropbox_folder_not_supported");
  }
  if (!file.link?.trim()) {
    throw new Error("dropbox_no_link");
  }
  if (file.bytes != null && file.bytes > MAX_ATTACHMENT_BYTES) {
    throw new Error("attachment_too_large");
  }

  // Dropbox direct links support CORS — download immediately in the browser.
  if (isDirectDropboxLink(file.link)) {
    try {
      return await fetchDirectInBrowser(file.link, file.name);
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.warn("[Weeon] Dropbox browser fetch failed, trying server proxy.", error);
      }
    }
  }

  return fetchViaServer(file.link, file.name);
}

async function ensureDropboxChooser(): Promise<void> {
  if (!isDropboxConfigured()) {
    throw new Error("dropbox_not_configured");
  }
  try {
    await loadScript("https://www.dropbox.com/static/api/2/dropins.js", {
      id: "dropboxjs",
      "data-app-key": DROPBOX_APP_KEY,
    });
  } catch {
    throw new Error("dropbox_unavailable");
  }
  if (!window.Dropbox?.choose) {
    throw new Error("dropbox_unavailable");
  }
}

/** Opens Dropbox Chooser and downloads picks right away (Dropbox-recommended flow). */
export async function pickDropboxFiles(maxFiles: number): Promise<File[]> {
  if (maxFiles <= 0) return [];
  await ensureDropboxChooser();

  return new Promise((resolve, reject) => {
    let settled = false;
    const timer = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(new Error("dropbox_timeout"));
    }, 120_000);

    const finish = (value: File[]) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      resolve(value);
    };

    const fail = (error: unknown) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      if (process.env.NODE_ENV === "development") {
        console.warn("[Weeon] Dropbox import failed:", error);
      }
      reject(error instanceof Error ? error : new Error("dropbox_fetch_failed"));
    };

    window.Dropbox!.choose({
      linkType: "direct",
      multiselect: maxFiles > 1,
      success: (files) => {
        void (async () => {
          try {
            const picks = files.slice(0, maxFiles);
            if (picks.length === 0) {
              finish([]);
              return;
            }
            const localFiles = await Promise.all(picks.map((file) => chooserFileToLocal(file)));
            finish(localFiles);
          } catch (error) {
            fail(error);
          }
        })();
      },
      cancel: () => finish([]),
    });
  });
}
