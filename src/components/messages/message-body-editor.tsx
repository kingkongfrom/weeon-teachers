"use client";

import { useRef, useState } from "react";
import { Paperclip, X } from "lucide-react";
import { RichTextEditor } from "@/components/assessments/rich-text";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/client";
import type { RichTextDoc } from "@/lib/assessments/model";

function fileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function addFiles(current: File[], incoming: FileList | File[] | null | undefined): File[] {
  if (!incoming || incoming.length === 0) return current;
  return [...current, ...Array.from(incoming)];
}

/** Rich body field with drag/drop (and paste) attachments — no separate dropzone. */
export function MessageBodyEditor({
  value,
  onChange,
  placeholder,
  editorClassName,
  files,
  onFilesChange,
  disabled = false,
  label,
}: {
  value: RichTextDoc;
  onChange: (doc: RichTextDoc) => void;
  placeholder?: string;
  editorClassName?: string;
  files: File[];
  onFilesChange: (files: File[]) => void;
  disabled?: boolean;
  label: string;
}) {
  const t = useT();
  const m = t.messages;
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function stageFiles(incoming: FileList | File[] | null | undefined) {
    if (disabled) return;
    const next = addFiles(files, incoming);
    if (next.length !== files.length) onFilesChange(next);
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-foreground/60">{label}</span>
        <button
          type="button"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          className="inline-flex items-center gap-1 text-xs font-semibold text-brand-500 transition-colors hover:text-brand-600 disabled:opacity-50"
        >
          <Paperclip className="h-3.5 w-3.5" />
          {m.attachFile}
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          hidden
          disabled={disabled}
          onChange={(event) => {
            stageFiles(event.target.files);
            event.target.value = "";
          }}
        />
      </div>

      <div
        onDragOver={(event) => {
          if (disabled) return;
          if (event.dataTransfer.types.includes("Files")) {
            event.preventDefault();
            setDragging(true);
          }
        }}
        onDragLeave={(event) => {
          if (event.currentTarget.contains(event.relatedTarget as Node)) return;
          setDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          stageFiles(event.dataTransfer.files);
        }}
        onPaste={(event) => {
          if (disabled) return;
          const pasted = event.clipboardData?.files;
          if (pasted && pasted.length > 0) {
            event.preventDefault();
            stageFiles(pasted);
          }
        }}
        className={cn(
          "rounded-xl transition-shadow",
          dragging && "ring-2 ring-brand-400 ring-offset-2 ring-offset-surface",
        )}
      >
        <RichTextEditor
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          editorClassName={editorClassName}
        />
      </div>

      {files.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {files.map((file, index) => (
            <li
              key={`${file.name}-${file.size}-${index}`}
              className="inline-flex max-w-full items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5"
            >
              <Paperclip className="h-3.5 w-3.5 shrink-0 text-foreground/45" />
              <span className="truncate text-xs font-medium text-foreground/80">{file.name}</span>
              <span className="shrink-0 text-[11px] font-medium text-foreground/40">
                {fileSize(file.size)}
              </span>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onFilesChange(files.filter((_, i) => i !== index))}
                aria-label={m.remove}
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-foreground/40 transition-colors hover:bg-error/10 hover:text-error disabled:opacity-50"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
