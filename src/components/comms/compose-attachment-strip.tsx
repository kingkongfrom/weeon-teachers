"use client";

import { type RefObject } from "react";
import { Paperclip, X } from "lucide-react";
import { MESSAGE_ATTACHMENT_ACCEPT } from "@/lib/comms/attachment-mime";
import { useLiveT } from "@/lib/i18n/use-i18n";

/**
 * Attachment area for the composer: the hidden file input, the drop target, any
 * error, and the staged files. The attach affordance itself is the paperclip in
 * the editor toolbar - this component no longer offers sources of its own.
 */
export function ComposeAttachmentStrip({
  files,
  onRemoveFile,
  onAddFiles,
  sending,
  remainingAttachmentSlots,
  cloudError,
  fileInputRef,
}: {
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
    /*
     * NO EMPTY PANEL.
     *
     * With the drive row and the replies switch gone, the only thing left inside
     * the dashed box is the list of attached files. An always-visible bordered
     * frame would therefore show as an empty rectangle above the send row, so the
     * panel renders only when there is something to show. The hidden input and
     * the drop target live outside it, so attaching still works with nothing
     * attached yet.
     */
    <div>
      <div
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          if (event.dataTransfer.files.length > 0) onAddFiles(event.dataTransfer.files);
        }}
      >
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
      </div>

      {cloudError ? <p className="mt-2 text-xs font-medium text-error">{cloudError}</p> : null}

      {files.length > 0 ? (
        <div
          className="mt-4 rounded-xl border border-dashed border-border/70 bg-surface-muted/15 px-3 py-2.5 sm:px-4"
          title={dropHint}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            if (event.dataTransfer.files.length > 0) onAddFiles(event.dataTransfer.files);
          }}
        >
          <ul className="space-y-1">
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
        </div>
      ) : null}
    </div>
  );
}
