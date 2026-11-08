"use client";

import { type RefObject } from "react";
import { Paperclip, X } from "lucide-react";
import { MESSAGE_ATTACHMENT_ACCEPT } from "@/lib/comms/attachment-mime";
import { messagesTone } from "@/lib/comms/messages-tone";
import { cn } from "@/lib/utils";
import { useLiveT } from "@/lib/i18n/use-i18n";

/** Compact attachments + allow-replies on one row. */
export function ComposeAttachmentStrip({
  allowReplies,
  onAllowRepliesChange,
  files,
  onRemoveFile,
  onAddFiles,
  sending,
  remainingAttachmentSlots,
  cloudError,
  fileInputRef,
}: {
  allowReplies: boolean;
  onAllowRepliesChange: (value: boolean) => void;
  files: File[];
  onRemoveFile: (index: number) => void;
  onAddFiles: (files: FileList | File[]) => void;
  sending: boolean;
  remainingAttachmentSlots: number;
  cloudError: string | null;
  fileInputRef: RefObject<HTMLInputElement | null>;
}) {
  const t = useLiveT();
  const dropHint = t("comms.dropFilesHint");
  const attachmentsDisabled = sending || remainingAttachmentSlots <= 0;

  return (
    <div
      className="mt-6 hidden rounded-xl border border-dashed border-border/70 bg-surface-muted/15 px-3 py-2.5 sm:block sm:px-4"
      title={dropHint}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        if (event.dataTransfer.files.length > 0) onAddFiles(event.dataTransfer.files);
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        {/*
          THE DRIVE ROW IS GONE.
          "Mi dispositivo / Google Drive / Dropbox" sat here as a permanent strip
          under the message. It is the same three actions the paperclip in the
          editor toolbar offers as a dropdown, so the row was a second entry point
          to identical options - and it cost height above everything the user
          actually types. The paperclip is now the ONLY attach affordance, at every
          width, and it opens the same sources.
        */}

            {/*
              PHONES: no "Permitir respuesta" switch. It is a per-message policy
              control, set once and rarely changed, and it cost a full row on a
              phone. The value stays whatever the composer seeds, so behaviour is
              unchanged - only the control is hidden.
            */}
            <div className="ml-auto flex shrink-0 items-center gap-2 max-sm:hidden">
          <span className="text-xs font-semibold text-foreground/55">{t("comms.allowReplies")}</span>
          <button
            type="button"
            role="switch"
            aria-checked={allowReplies}
            aria-label={t("comms.allowReplies")}
            onClick={() => onAllowRepliesChange(!allowReplies)}
            className={cn(
              "inline-flex h-6 w-10 shrink-0 items-center rounded-full p-0.5 transition-colors",
              allowReplies ? messagesTone.toggleOn : "bg-foreground/20",
            )}
          >
            <span
              className={cn(
                "block h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ease-out",
                allowReplies ? "translate-x-4" : "translate-x-0",
              )}
            />
          </button>
        </div>
      </div>

      {cloudError ? <p className="mt-2 text-xs font-medium text-error">{cloudError}</p> : null}

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={MESSAGE_ATTACHMENT_ACCEPT}
        className="hidden"
        disabled={attachmentsDisabled}
        onChange={(event) => {
          if (event.target.files) onAddFiles(event.target.files);
          event.target.value = "";
        }}
      />

      {files.length > 0 ? (
        <ul className="mt-2 space-y-1 border-t border-border/50 pt-2">
          {files.map((file, index) => (
            <li
              key={`${file.name}-${index}`}
              className="flex items-center justify-between gap-2 rounded-lg px-1 py-1 text-sm"
            >
              <span className="inline-flex min-w-0 items-center gap-2">
                <Paperclip className="h-3.5 w-3.5 shrink-0 text-foreground/40" />
                <span className="truncate text-xs font-medium text-foreground/85">{file.name}</span>
              </span>
              <button
                type="button"
                onClick={() => onRemoveFile(index)}
                className="text-foreground/40 hover:text-error"
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
