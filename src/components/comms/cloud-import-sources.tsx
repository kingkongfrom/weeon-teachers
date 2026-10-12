"use client";

import { Cloud, HardDrive, Loader2 } from "lucide-react";
import { useState, type ReactNode } from "react";
import {
  isDropboxConfigured,
  isGoogleDriveConfigured,
} from "@/lib/comms/cloud-import/config";
import { pickDropboxFiles } from "@/lib/comms/cloud-import/dropbox-client";
import { fetchGoogleDriveImportsAsFiles } from "@/lib/comms/cloud-import/google-drive-fetch";
import { pickGoogleDriveFiles } from "@/lib/comms/cloud-import/google-drive-client";
import type { CloudImportRef } from "@/lib/comms/cloud-import/types";
import { messagesTone } from "@/lib/comms/messages-tone";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/use-i18n";

type BusySource = "dropbox" | "google-drive" | null;

function mapCloudError(error: unknown, t: ReturnType<typeof useT>): string {
  const code = error instanceof Error ? error.message : "";
  if (code.includes("not_configured")) return t("comms.documents.cloudNotConfigured");
  if (code === "attachment_type_not_allowed") return t("comms.attachmentTypeNotAllowed");
  if (code === "attachment_too_large") return t("comms.attachmentTooLarge");
  if (code === "dropbox_folder_not_supported") return t("comms.documents.dropboxFolderNotSupported");
  if (
    code === "google_auth_failed" ||
    code === "google_picker_unavailable" ||
    code === "gapi_unavailable"
  ) {
    return t("comms.documents.cloudAuthFailed");
  }
  if (
    code === "google_drive_fetch_failed" ||
    code === "google_drive_not_configured"
  ) {
    return t("comms.documents.googleDriveImportFailed");
  }
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

function SourceButton({
  label,
  title,
  ready,
  busy,
  disabled,
  onClick,
  icon,
  compact = false,
}: {
  label: string;
  title: string;
  ready: boolean;
  busy: boolean;
  disabled?: boolean;
  onClick: () => void;
  icon: ReactNode;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled || !ready}
      onClick={onClick}
      className={cn(
        "text-xs font-semibold transition-colors",
        compact
          ? "ui-hover inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 hover:bg-surface-muted/80"
          : "inline-flex min-w-[4.5rem] flex-col items-center gap-1",
        ready
          ? compact
            ? "text-foreground/70 hover:text-foreground"
            : cn(messagesTone.accentText, "hover:brightness-110")
          : "cursor-not-allowed text-foreground/30",
        disabled && ready && "opacity-50",
      )}
    >
      {busy ? (
        <Loader2 className={cn("animate-spin", compact ? "h-4 w-4" : "h-8 w-8")} />
      ) : (
        icon
      )}
      {label}
    </button>
  );
}

export function CloudImportSources({
  remainingSlots,
  disabled,
  onLocalFiles,
  onCloudImports,
  onError,
  compact = false,
}: {
  remainingSlots: number;
  disabled?: boolean;
  onLocalFiles: (files: File[]) => void;
  /** When set, Google Drive picks are kept as cloud refs (download on server submit). */
  onCloudImports?: (refs: CloudImportRef[]) => void;
  onError: (message: string) => void;
  compact?: boolean;
}) {
  const t = useT();
  const [busySource, setBusySource] = useState<BusySource>(null);
  const dropboxReady = isDropboxConfigured();
  const googleReady = isGoogleDriveConfigured();
  const busy = busySource !== null;

  async function runDropboxPick() {
    if (disabled || busy || remainingSlots <= 0 || !dropboxReady) return;
    setBusySource("dropbox");
    onError("");
    try {
      const files = await pickDropboxFiles(remainingSlots);
      if (files.length > 0) onLocalFiles(files);
    } catch (error) {
      onError(mapCloudError(error, t));
    } finally {
      setBusySource(null);
    }
  }

  async function runGoogleDrivePick() {
    if (disabled || busy || remainingSlots <= 0 || !googleReady) return;
    setBusySource("google-drive");
    onError("");
    try {
      const refs = await pickGoogleDriveFiles(remainingSlots);
      if (refs.length === 0) return;

      if (onCloudImports) {
        onCloudImports(refs);
        return;
      }

      const files = await fetchGoogleDriveImportsAsFiles(refs);
      if (files.length > 0) onLocalFiles(files);
    } catch (error) {
      onError(mapCloudError(error, t));
    } finally {
      setBusySource(null);
    }
  }

  const notConfiguredHint = t("comms.documents.cloudNotConfigured");

  return (
    <>
      <SourceButton
        compact={compact}
        label={t("comms.documents.googleDrive")}
        title={googleReady ? t("comms.documents.googleDrive") : notConfiguredHint}
        ready={googleReady}
        busy={busySource === "google-drive"}
        disabled={disabled || remainingSlots <= 0 || busy}
        onClick={() => void runGoogleDrivePick()}
        icon={
          <HardDrive
            className={cn(compact ? "h-4 w-4 text-[#4285F4]" : "h-8 w-8 text-[#4285F4]")}
            strokeWidth={1.75}
          />
        }
      />
      <SourceButton
        compact={compact}
        label={t("comms.documents.dropbox")}
        title={dropboxReady ? t("comms.documents.dropbox") : notConfiguredHint}
        ready={dropboxReady}
        busy={busySource === "dropbox"}
        disabled={disabled || remainingSlots <= 0 || busy}
        onClick={() => void runDropboxPick()}
        icon={<Cloud className={cn(compact ? "h-4 w-4" : "h-8 w-8")} strokeWidth={1.75} />}
      />
    </>
  );
}
