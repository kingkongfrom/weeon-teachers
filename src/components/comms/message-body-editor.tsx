"use client";

import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import { Loader2, Paperclip } from "lucide-react";
import { RichTextEditor } from "@/components/comms/rich-text";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/use-i18n";
import { MESSAGE_ATTACHMENT_ACCEPT } from "@/lib/comms/attachment-mime";
import { collectEmbedPaths } from "@/lib/comms/rich-text-embeds";
import { uploadCommsDraftEmbed } from "@/lib/dashboard/comms-embed-actions";
import type { RichTextDoc } from "@/lib/comms/model";

export function messageBodyHasContent(doc: RichTextDoc, extraFiles = 0): boolean {
  if (extraFiles > 0) return true;
  if (collectEmbedPaths(doc).length > 0) return true;
  const text = doc.content
    ?.flatMap((block) =>
      (block.content ?? [])
        .map((node) => (typeof node.text === "string" ? node.text : ""))
        .join(""),
    )
    .join("")
    .trim();
  return Boolean(text && text.length > 0);
}

export type MessageBodyEditorHandle = {
  getDoc: () => RichTextDoc;
};

export const MessageBodyEditor = forwardRef(function MessageBodyEditor(
  {
    value,
    onChange,
    placeholder,
    editorClassName,
    files = [],
    onFilesChange,
    disabled = false,
    label,
    inlineEmbeds = true,
  }: {
    value: RichTextDoc;
    onChange: (doc: RichTextDoc) => void;
    placeholder?: string;
    editorClassName?: string;
    files?: File[];
    onFilesChange?: (files: File[]) => void;
    disabled?: boolean;
    label?: string;
    inlineEmbeds?: boolean;
  },
  ref: React.Ref<MessageBodyEditorHandle>,
) {
  const t = useT();
  const inputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<Editor | null>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useImperativeHandle(ref, () => ({
    getDoc: () => (editorRef.current?.getJSON() as RichTextDoc) ?? value,
  }));

  function syncDoc(editor: Editor) {
    onChange(editor.getJSON() as RichTextDoc);
  }

  async function embedFiles(incoming: FileList | File[] | null | undefined) {
    if (disabled || !incoming || incoming.length === 0) return;
    const editor = editorRef.current;
    if (!editor || !inlineEmbeds) {
      onFilesChange?.([...files, ...Array.from(incoming)]);
      return;
    }

    setUploading(true);
    setError(null);
    try {
      for (const file of Array.from(incoming)) {
        const formData = new FormData();
        formData.set("file", file);
        const result = await uploadCommsDraftEmbed(formData);
        if (!result.ok) {
          setError(result.error);
          continue;
        }

        if (result.kind === "image") {
          const imageNode = editor.schema.nodes.image?.create({
            src: result.url,
            path: result.path,
            alt: result.fileName,
          });
          if (imageNode) {
            editor.chain().focus().insertContent(imageNode).run();
            syncDoc(editor);
          }
        } else {
          const fileNode = editor.schema.nodes.fileEmbed?.create({
            path: result.path,
            fileName: result.fileName,
            mimeType: result.mimeType,
            src: result.url,
          });
          if (fileNode) {
            editor.chain().focus().insertContent(fileNode).run();
            syncDoc(editor);
          }
        }
      }
    } finally {
      setUploading(false);
    }
  }

  const showFileChrome = inlineEmbeds;

  return (
    <div className="flex flex-col gap-1.5">
      {showFileChrome ? (
        <div className="flex items-center justify-between gap-2">
          {label ? (
            <span className="text-xs font-semibold text-foreground/60">{label}</span>
          ) : (
            <span />
          )}
          <button
            type="button"
            disabled={disabled || uploading}
            onClick={() => inputRef.current?.click()}
            className="inline-flex items-center gap-1 text-xs font-semibold text-brand-500 transition-colors hover:text-brand-600 disabled:opacity-50"
          >
            {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Paperclip className="h-3.5 w-3.5" />}
            {t("comms.insertInBody")}
          </button>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={MESSAGE_ATTACHMENT_ACCEPT}
            hidden
            disabled={disabled || uploading}
            onChange={(event) => {
              void embedFiles(event.target.files);
              event.target.value = "";
            }}
          />
        </div>
      ) : null}

      <div
        onDragOver={
          showFileChrome
            ? (event) => {
                if (disabled || uploading) return;
                if (event.dataTransfer.types.includes("Files")) {
                  event.preventDefault();
                  setDragging(true);
                }
              }
            : undefined
        }
        onDragLeave={
          showFileChrome
            ? (event) => {
                if (event.currentTarget.contains(event.relatedTarget as Node)) return;
                setDragging(false);
              }
            : undefined
        }
        onDrop={
          showFileChrome
            ? (event) => {
                event.preventDefault();
                setDragging(false);
                void embedFiles(event.dataTransfer.files);
              }
            : undefined
        }
        onPaste={
          showFileChrome
            ? (event) => {
                if (disabled || uploading) return;
                const pasted = event.clipboardData?.files;
                if (pasted && pasted.length > 0) {
                  event.preventDefault();
                  void embedFiles(pasted);
                }
              }
            : undefined
        }
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
          enableInlineEmbeds={inlineEmbeds}
          onEditorReady={(editor) => {
            editorRef.current = editor;
          }}
        />
      </div>

      {error ? (
        <p className="rounded-lg bg-error/10 px-3 py-2 text-sm font-medium text-error">{error}</p>
      ) : null}

      {inlineEmbeds ? (
        <p className="text-[11px] text-foreground/45">{t("comms.embedBodyHint")}</p>
      ) : null}
    </div>
  );
});
