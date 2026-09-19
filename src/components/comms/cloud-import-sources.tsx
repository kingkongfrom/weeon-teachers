"use client";

import { Cloud, Loader2 } from "lucide-react";
import { useState } from "react";
import { isDropboxConfigured } from "@/lib/comms/cloud-import/config";
import { pickDropboxFiles } from "@/lib/comms/cloud-import/dropbox-client";
import { messagesTone } from "@/lib/comms/messages-tone";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/use-i18n";

function mapCloudError(error: unknown, t: (key: string) => string): string {
  const code = error instanceof Error ? error.message : "";
  if (code.includes("not_configured")) return t("comms.documents.cloudNotConfigured");
  if (code === "attachment_type_not_allowed") return t("comms.attachmentTypeNotAllowed");
  if (code === "attachment_too_large") return t("comms.attachmentTooLarge");
  if (code === "dropbox_folder_not_supported") return t("comms.documents.dropboxFolderNotSupported");
  if (
    code === "dropbox_fetch_failed" ||
    code === "invalid_dropbox_url" ||
    code === "dropbox_no_link" ||
    code === "dropbox_empty_file" ||
    code.startsWith("dropbox_http_") ||
    code === "dropbox_timeout" ||
    code === "dropbox_unavailable"
  ) {
    return t("comms.documents.dropboxImportFailed");
  }
  return t("comms.documents.cloudImportFailed");
}

export function CloudImportSources({
  remainingSlots,
  disabled,
  onLocalFiles,
  onError,
}: {
  remainingSlots: number;
  disabled?: boolean;
  onLocalFiles: (files: File[]) => void;
  onError: (message: string) => void;
}) {
  const t = useT();
  const [busy, setBusy] = useState(false);
  const dropboxReady = isDropboxConfigured();

  async function runDropboxPick() {
    if (disabled || busy || remainingSlots <= 0 || !dropboxReady) return;
    setBusy(true);
    onError("");
    try {
      const files = await pickDropboxFiles(remainingSlots);
      if (files.length > 0) onLocalFiles(files);
    } catch (error) {
      onError(mapCloudError(error, t));
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      title={dropboxReady ? t("comms.documents.dropbox") : t("comms.documents.cloudNotConfigured")}
      disabled={disabled || remainingSlots <= 0 || !dropboxReady}
      onClick={() => void runDropboxPick()}
      className={cn(
        "inline-flex min-w-[4.5rem] flex-col items-center gap-1 text-xs font-semibold transition-colors",
        dropboxReady
          ? cn(messagesTone.accentText, "hover:brightness-110")
          : "cursor-not-allowed text-foreground/30",
        disabled && dropboxReady && "opacity-50",
      )}
    >
      {busy ? (
        <Loader2 className="h-8 w-8 animate-spin" />
      ) : (
        <Cloud className="h-8 w-8" strokeWidth={1.75} />
      )}
      {t("comms.documents.dropbox")}
    </button>
  );
}
