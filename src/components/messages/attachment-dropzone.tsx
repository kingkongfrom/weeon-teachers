"use client";

import { useRef, useState } from "react";
import { Paperclip, Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/client";

function fileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Drag-and-drop file staging area (also click-to-browse). */
export function AttachmentDropzone({
  files,
  onChange,
  disabled = false,
}: {
  files: File[];
  onChange: (files: File[]) => void;
  disabled?: boolean;
}) {
  const t = useT();
  const m = t.messages;
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function add(list: FileList | null) {
    if (!list || disabled) return;
    onChange([...files, ...Array.from(list)]);
  }

  return (
    <div className="flex flex-col gap-2">
      <div
        role="button"
        tabIndex={0}
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(event) => {
          if ((event.key === "Enter" || event.key === " ") && !disabled) inputRef.current?.click();
        }}
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          add(event.dataTransfer.files);
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center gap-1 rounded-2xl border border-dashed px-4 py-6 text-center transition-colors",
          dragging ? "border-brand-400 bg-brand-50/60 dark:bg-brand-950/20" : "border-border hover:bg-surface-muted/40",
          disabled && "pointer-events-none opacity-50",
        )}
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-muted text-foreground/50">
          <Upload className="h-5 w-5" />
        </span>
        <p className="text-sm font-semibold text-foreground/80">{m.dropFiles}</p>
        <p className="text-xs font-medium text-foreground/45">{m.browseFiles}</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          hidden
          onChange={(event) => {
            add(event.target.files);
            event.target.value = "";
          }}
        />
      </div>

      {files.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {files.map((file, index) => (
            <li
              key={`${file.name}-${index}`}
              className="inline-flex max-w-full items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5"
            >
              <Paperclip className="h-3.5 w-3.5 shrink-0 text-foreground/45" />
              <span className="truncate text-xs font-medium text-foreground/80">{file.name}</span>
              <span className="shrink-0 text-[11px] font-medium text-foreground/40">
                {fileSize(file.size)}
              </span>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onChange(files.filter((_, i) => i !== index));
                }}
                aria-label={m.remove}
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-foreground/40 transition-colors hover:bg-error/10 hover:text-error"
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
