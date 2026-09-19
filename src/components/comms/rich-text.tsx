"use client";

import { useEffect, useReducer, type CSSProperties, type ReactNode } from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Placeholder } from "@tiptap/extensions";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import TiptapImage from "@tiptap/extension-image";
import Underline from "@tiptap/extension-underline";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Code,
  CodeSquare,
  Heading1,
  Heading2,
  Heading3,
  Highlighter,
  Pilcrow,
  Italic,
  Link2,
  List,
  ListOrdered,
  Minus,
  Quote,
  Redo2,
  RemoveFormatting,
  Strikethrough,
  Underline as UnderlineIcon,
  Undo2,
  Unlink2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { FileEmbed } from "@/lib/comms/tiptap-file-embed";
import type { RichTextDoc, RichTextNode } from "@/lib/comms/model";
import { useT } from "@/lib/i18n/use-i18n";

const CommsImage = TiptapImage.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      path: { default: null },
    };
  },
}).configure({ inline: false, allowBase64: false, HTMLAttributes: { class: "rte-image" } });

export function RichTextEditor({
  value,
  onChange,
  placeholder,
  className,
  editorClassName,
  enableInlineEmbeds = false,
  onEditorReady,
}: {
  value: RichTextDoc;
  onChange: (doc: RichTextDoc) => void;
  placeholder?: string;
  className?: string;
  editorClassName?: string;
  /** When true, supports inline images and document cards in the body. */
  enableInlineEmbeds?: boolean;
  onEditorReady?: (editor: Editor) => void;
}) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        link: {
          openOnClick: false,
          HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
        },
      }),
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Highlight,
      ...(enableInlineEmbeds ? [CommsImage, FileEmbed] : []),
      Placeholder.configure({ placeholder: placeholder ?? "" }),
    ],
    content: value,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: cn(
          "rte-content min-h-[2.75rem] px-3 py-2 text-sm focus:outline-none",
          editorClassName,
        ),
      },
    },
    onUpdate: ({ editor: instance }) => {
      onChange(instance.getJSON() as RichTextDoc);
    },
  });

  useEffect(() => {
    if (!editor) return;
    onEditorReady?.(editor);
  }, [editor, onEditorReady]);

  useEffect(() => {
    if (!editor) return;
    const current = JSON.stringify(editor.getJSON());
    const incoming = JSON.stringify(value);
    if (current !== incoming) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
  }, [editor, value]);

  if (!editor) {
    return <div className="min-h-[4.5rem] rounded-xl border border-border bg-background" />;
  }

  return (
    <div className={cn("overflow-hidden rounded-xl border border-border bg-background", className)}>
      <RichTextToolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}

function RichTextToolbar({ editor }: { editor: Editor }) {
  const t = useT();
  const [, rerenderToolbar] = useReducer((version: number) => version + 1, 0);

  useEffect(() => {
    const refresh = () => rerenderToolbar();
    editor.on("transaction", refresh);
    editor.on("selectionUpdate", refresh);
    return () => {
      editor.off("transaction", refresh);
      editor.off("selectionUpdate", refresh);
    };
  }, [editor]);

  function setLink() {
    const previous = (editor.getAttributes("link").href as string | undefined) ?? "";
    const url = window.prompt(t("comms.rte.linkPrompt"), previous || "https://");
    if (url === null) return;
    const trimmed = url.trim();
    if (!trimmed) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: trimmed }).run();
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 border-b border-border bg-surface-muted/40 p-1.5">
      <ToolbarGroup>
        <ToolbarButton
          label={t("comms.rte.undo")}
          disabled={!editor.can().chain().focus().undo().run()}
          onClick={() => editor.chain().focus().undo().run()}
        >
          <Undo2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label={t("comms.rte.redo")}
          disabled={!editor.can().chain().focus().redo().run()}
          onClick={() => editor.chain().focus().redo().run()}
        >
          <Redo2 className="h-4 w-4" />
        </ToolbarButton>
      </ToolbarGroup>

      <ToolbarGroup>
        <ToolbarButton
          active={editor.isActive("paragraph")}
          label={t("comms.rte.paragraph")}
          onClick={() => editor.chain().focus().setParagraph().run()}
        >
          <Pilcrow className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("heading", { level: 1 })}
          label={t("comms.rte.heading1")}
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        >
          <Heading1 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("heading", { level: 2 })}
          label={t("comms.rte.heading2")}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <Heading2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("heading", { level: 3 })}
          label={t("comms.rte.heading3")}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          <Heading3 className="h-4 w-4" />
        </ToolbarButton>
      </ToolbarGroup>

      <ToolbarGroup>
        <ToolbarButton
          active={editor.isActive("bold")}
          label={t("comms.rte.bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("italic")}
          label={t("comms.rte.italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("underline")}
          label={t("comms.rte.underline")}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <UnderlineIcon className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("strike")}
          label={t("comms.rte.strike")}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          <Strikethrough className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("highlight")}
          label={t("comms.rte.highlight")}
          onClick={() => editor.chain().focus().toggleHighlight().run()}
        >
          <Highlighter className="h-4 w-4" />
        </ToolbarButton>
      </ToolbarGroup>

      <ToolbarGroup>
        <ToolbarButton
          active={editor.isActive("link")}
          label={t("comms.rte.link")}
          onClick={setLink}
        >
          <Link2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label={t("comms.rte.unlink")}
          disabled={!editor.isActive("link")}
          onClick={() => editor.chain().focus().unsetLink().run()}
        >
          <Unlink2 className="h-4 w-4" />
        </ToolbarButton>
      </ToolbarGroup>

      <ToolbarGroup>
        <ToolbarButton
          active={editor.isActive("bulletList")}
          label={t("comms.rte.bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("orderedList")}
          label={t("comms.rte.orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("blockquote")}
          label={t("comms.rte.blockquote")}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          <Quote className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("code")}
          label={t("comms.rte.inlineCode")}
          onClick={() => editor.chain().focus().toggleCode().run()}
        >
          <Code className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("codeBlock")}
          label={t("comms.rte.codeBlock")}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        >
          <CodeSquare className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label={t("comms.rte.horizontalRule")}
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
        >
          <Minus className="h-4 w-4" />
        </ToolbarButton>
      </ToolbarGroup>

      <ToolbarGroup>
        <ToolbarButton
          active={editor.isActive({ textAlign: "left" })}
          label={t("comms.rte.alignLeft")}
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
        >
          <AlignLeft className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive({ textAlign: "center" })}
          label={t("comms.rte.alignCenter")}
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
        >
          <AlignCenter className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive({ textAlign: "right" })}
          label={t("comms.rte.alignRight")}
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
        >
          <AlignRight className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive({ textAlign: "justify" })}
          label={t("comms.rte.alignJustify")}
          onClick={() => editor.chain().focus().setTextAlign("justify").run()}
        >
          <AlignJustify className="h-4 w-4" />
        </ToolbarButton>
      </ToolbarGroup>

      <ToolbarGroup>
        <ToolbarButton
          label={t("comms.rte.clearFormatting")}
          onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
        >
          <RemoveFormatting className="h-4 w-4" />
        </ToolbarButton>
      </ToolbarGroup>
    </div>
  );
}

function ToolbarGroup({ children }: { children: ReactNode }) {
  return (
    <div className="inline-flex items-center gap-0.5 rounded-lg border border-border/80 bg-background/80 p-0.5 shadow-sm">
      {children}
    </div>
  );
}

function ToolbarButton({
  active,
  disabled,
  onClick,
  label,
  children,
}: {
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  label: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-md text-foreground/60 transition-colors hover:bg-surface-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-35",
        active && "bg-brand-50 text-brand-700 shadow-sm dark:bg-brand-950/40 dark:text-brand-300",
      )}
    >
      {children}
    </button>
  );
}

export function RichTextView({
  doc,
  className,
}: {
  doc: RichTextDoc | null | undefined;
  className?: string;
}) {
  if (!doc?.content || doc.content.length === 0) return null;
  return <div className={cn("rte-content", className)}>{renderNodes(doc.content)}</div>;
}

function alignmentStyle(node: RichTextNode): CSSProperties | undefined {
  const align = node.attrs?.textAlign;
  if (align === "center" || align === "right" || align === "left" || align === "justify") {
    return { textAlign: align };
  }
  return undefined;
}

function renderNodes(nodes: RichTextNode[]): ReactNode {
  return nodes.map((node, index) => renderNode(node, index));
}

function renderNode(node: RichTextNode, key: number): ReactNode {
  switch (node.type) {
    case "paragraph":
      return (
        <p key={key} style={alignmentStyle(node)}>
          {renderInline(node.content)}
        </p>
      );
    case "heading": {
      const level = Number(node.attrs?.level ?? 2);
      if (level === 1) {
        return (
          <h1 key={key} style={alignmentStyle(node)}>
            {renderInline(node.content)}
          </h1>
        );
      }
      if (level === 3) {
        return (
          <h3 key={key} style={alignmentStyle(node)}>
            {renderInline(node.content)}
          </h3>
        );
      }
      return (
        <h2 key={key} style={alignmentStyle(node)}>
          {renderInline(node.content)}
        </h2>
      );
    }
    case "bulletList":
      return <ul key={key}>{renderNodes(node.content ?? [])}</ul>;
    case "orderedList": {
      const start = Number(node.attrs?.start ?? 1);
      return (
        <ol key={key} start={start !== 1 ? start : undefined}>
          {renderNodes(node.content ?? [])}
        </ol>
      );
    }
    case "listItem":
      return <li key={key}>{renderNodes(node.content ?? [])}</li>;
    case "blockquote":
      return <blockquote key={key}>{renderNodes(node.content ?? [])}</blockquote>;
    case "codeBlock":
      return (
        <pre key={key}>
          <code>{renderInline(node.content)}</code>
        </pre>
      );
    case "horizontalRule":
      return <hr key={key} />;
    case "hardBreak":
      return <br key={key} />;
    case "text":
      return <span key={key}>{applyMarks(node.text ?? "", node.marks)}</span>;
    case "image": {
      const src = typeof node.attrs?.src === "string" ? node.attrs.src : "";
      const alt = typeof node.attrs?.alt === "string" ? node.attrs.alt : "";
      if (!src) return null;
      return (
        <figure key={key} className="rte-figure">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={alt} className="rte-image" />
        </figure>
      );
    }
    case "fileEmbed": {
      const src = typeof node.attrs?.src === "string" ? node.attrs.src : "";
      const fileName =
        (typeof node.attrs?.fileName === "string" && node.attrs.fileName) || "Documento";
      if (!src) {
        return (
          <div key={key} className="rte-file-embed rte-file-embed-static">
            <span className="rte-file-embed-icon" aria-hidden>
              📄
            </span>
            <span className="rte-file-embed-name">{fileName}</span>
          </div>
        );
      }
      return (
        <a
          key={key}
          href={src}
          target="_blank"
          rel="noopener noreferrer"
          className="rte-file-embed"
        >
          <span className="rte-file-embed-icon" aria-hidden>
            📄
          </span>
          <span className="rte-file-embed-name">{fileName}</span>
        </a>
      );
    }
    default:
      return node.content ? <span key={key}>{renderNodes(node.content)}</span> : null;
  }
}

function renderInline(nodes: RichTextNode[] | undefined): ReactNode {
  return renderNodes(nodes ?? []);
}

function safeHref(href: unknown): string | null {
  if (typeof href !== "string") return null;
  return /^(https?:|mailto:|tel:|\/|#)/i.test(href) ? href : null;
}

function applyMarks(text: string, marks: RichTextNode["marks"]): ReactNode {
  let node: ReactNode = text;
  for (const mark of marks ?? []) {
    if (mark.type === "bold") node = <strong>{node}</strong>;
    else if (mark.type === "italic") node = <em>{node}</em>;
    else if (mark.type === "underline") node = <u>{node}</u>;
    else if (mark.type === "strike") node = <s>{node}</s>;
    else if (mark.type === "code") node = <code>{node}</code>;
    else if (mark.type === "highlight") node = <mark>{node}</mark>;
    else if (mark.type === "link") {
      const href = safeHref(mark.attrs?.href);
      node = href ? (
        <a href={href} target="_blank" rel="noopener noreferrer">
          {node}
        </a>
      ) : (
        node
      );
    }
  }
  return node;
}
