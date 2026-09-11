"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import {
  EditorContent,
  useEditor,
  useEditorState,
  type Editor,
} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Placeholder } from "@tiptap/extensions";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Code,
  Highlighter,
  Italic,
  Link2,
  List,
  ListOrdered,
  Loader2,
  Minus,
  Quote,
  Redo2,
  RemoveFormatting,
  Sparkles,
  SquareCode,
  Strikethrough,
  TriangleAlert,
  Underline,
  Undo2,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/client";
import type { RichTextDoc, RichTextNode } from "@/lib/assessments/model";
import { checkGrammar } from "@/lib/ai/grammar-actions";
import {
  GrammarCheck,
  applyGrammarDecorations,
  clearGrammarDecorations,
} from "@/components/assessments/grammar-extension";

type UiIssue = {
  id: string;
  from: number;
  to: number;
  message: string;
  replacements: string[];
};

/** WYSIWYG rich-text field. Emits a ProseMirror JSON doc (never HTML), which
 * the renderer below and the Flutter app both consume safely. Includes a
 * LanguageTool-powered spelling/grammar check. */
export function RichTextEditor({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: RichTextDoc;
  onChange: (doc: RichTextDoc) => void;
  placeholder?: string;
  className?: string;
}) {
  const t = useT();
  const [issues, setIssues] = useState<UiIssue[]>([]);
  const [checking, setChecking] = useState(false);
  const [checked, setChecked] = useState(false);
  const [checkError, setCheckError] = useState<string | null>(null);
  const [grammarEnabled, setGrammarEnabled] = useState(false);
  const [checkLanguage, setCheckLanguage] = useState("auto");
  const grammarEnabledRef = useRef(false);
  const checkLanguageRef = useRef("auto");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Set while we edit programmatically (applying a fix) so onUpdate does not
  // wipe the decorations we are about to recompute.
  const suppressInvalidate = useRef(false);

  async function runCheckFor(instance: Editor) {
    setChecking(true);
    setCheckError(null);
    const { text, map } = flattenDoc(instance.state.doc);
    const result = await checkGrammar({ text, language: checkLanguageRef.current });
    if (instance.isDestroyed) return;
    setChecking(false);
    setChecked(true);

    if (!result.ok) {
      setCheckError(result.error);
      setIssues([]);
      clearGrammarDecorations(instance);
      return;
    }

    const mapped: UiIssue[] = [];
    for (const issue of result.issues) {
      const from = mapPosition(map, issue.offset);
      const to = mapPosition(map, issue.offset + issue.length);
      if (from === null || to === null || to <= from) continue;
      mapped.push({
        id: `${issue.offset}-${issue.length}-${issue.ruleId ?? ""}`,
        from,
        to,
        message: issue.message,
        replacements: issue.replacements,
      });
    }

    setIssues(mapped);
    applyGrammarDecorations(
      instance,
      mapped.map((issue) => ({
        from: issue.from,
        to: issue.to,
        message: issue.message,
      })),
    );
  }

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        link: {
          openOnClick: false,
          HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
        },
      }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Highlight,
      GrammarCheck,
      Placeholder.configure({ placeholder: placeholder ?? "" }),
    ],
    content: value,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "rte-content min-h-[2.75rem] px-3 py-2 text-sm focus:outline-none",
      },
    },
    onUpdate: ({ editor: instance }) => {
      onChange(instance.getJSON() as RichTextDoc);
      if (suppressInvalidate.current) return;
      // Text changed: previous offsets are stale.
      setIssues((previous) => (previous.length ? [] : previous));
      setChecked(false);
      queueMicrotask(() => {
        if (!instance.isDestroyed) clearGrammarDecorations(instance);
      });
      // While the toggle is on, re-check after the teacher pauses typing.
      if (!grammarEnabledRef.current) return;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        if (!instance.isDestroyed) void runCheckFor(instance);
      }, 1200);
    },
  });

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  function toggleGrammar() {
    if (!editor) return;
    const next = !grammarEnabled;
    setGrammarEnabled(next);
    grammarEnabledRef.current = next;
    if (next) {
      void runCheckFor(editor);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setIssues([]);
    setChecked(false);
    setCheckError(null);
    clearGrammarDecorations(editor);
  }

  function applyFix(issue: UiIssue, replacement: string) {
    if (!editor) return;
    suppressInvalidate.current = true;
    editor
      .chain()
      .focus()
      .insertContentAt(
        { from: issue.from, to: issue.to },
        replacementPreservingSpace(editor, issue, replacement),
      )
      .run();
    suppressInvalidate.current = false;
    void runCheckFor(editor);
  }

  function ignoreIssue(issue: UiIssue) {
    if (!editor) return;
    const remaining = issues.filter((current) => current.id !== issue.id);
    setIssues(remaining);
    applyGrammarDecorations(
      editor,
      remaining.map((current) => ({
        from: current.from,
        to: current.to,
        message: current.message,
      })),
    );
  }

  /** Applies the top suggestion for every issue in one pass. Fixes run from the
   * end of the document backward so earlier offsets stay valid. */
  function fixAll() {
    if (!editor) return;
    const applicable = issues
      .filter((issue) => issue.replacements.length > 0)
      .sort((left, right) => right.from - left.from);
    if (applicable.length === 0) return;
    suppressInvalidate.current = true;
    const chain = editor.chain().focus();
    for (const issue of applicable) {
      chain.insertContentAt(
        { from: issue.from, to: issue.to },
        replacementPreservingSpace(editor, issue, issue.replacements[0]),
      );
    }
    chain.run();
    suppressInvalidate.current = false;
    void runCheckFor(editor);
  }

  function changeLanguage(value: string) {
    setCheckLanguage(value);
    checkLanguageRef.current = value;
    if (grammarEnabledRef.current && editor) {
      void runCheckFor(editor);
    }
  }

  if (!editor) {
    return (
      <div className="min-h-[4.5rem] rounded-xl border border-border bg-background" />
    );
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-border bg-background transition-colors focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-100 dark:focus-within:ring-brand-950",
        className,
      )}
    >
      <Toolbar
        editor={editor}
        grammarEnabled={grammarEnabled}
        checking={checking}
        checkLanguage={checkLanguage}
        onLanguageChange={changeLanguage}
        onToggleGrammar={toggleGrammar}
      />
      <EditorContent editor={editor} />
      {!grammarEnabled ? null : checkError ? (
        <p className="border-t border-border px-3 py-2 text-xs font-medium text-error">
          {checkError}
        </p>
      ) : issues.length > 0 ? (
        <GrammarPanel
          issues={issues}
          onApply={applyFix}
          onIgnore={ignoreIssue}
          onFixAll={fixAll}
        />
      ) : checked ? (
        <p className="border-t border-border px-3 py-2 text-xs font-medium text-emerald-600 dark:text-emerald-400">
          {t.editor.grammarNone}
        </p>
      ) : null}
    </div>
  );
}

function GrammarPanel({
  issues,
  onApply,
  onIgnore,
  onFixAll,
}: {
  issues: UiIssue[];
  onApply: (issue: UiIssue, replacement: string) => void;
  onIgnore: (issue: UiIssue) => void;
  onFixAll: () => void;
}) {
  const t = useT();
  const fixable = issues.some((issue) => issue.replacements.length > 0);
  return (
    <div className="flex max-h-56 flex-col gap-1 overflow-y-auto border-t border-border bg-surface-muted/30 p-2">
      <div className="flex items-center justify-between gap-2 px-1">
        <p className="text-[11px] font-bold uppercase tracking-wide text-foreground/45">
          {t.editor.grammarTitle} · {issues.length}
        </p>
        {fixable ? (
          <button
            type="button"
            onClick={onFixAll}
            className="rounded-md brand-gradient px-2.5 py-1 text-[11px] font-bold text-white transition-all hover:brightness-105"
          >
            {t.editor.fixAll}
          </button>
        ) : null}
      </div>
      {issues.map((issue) => (
        <div key={issue.id} className="flex items-start gap-2 rounded-lg px-2 py-1.5">
          <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-foreground/70">{issue.message}</p>
            <div className="mt-1 flex flex-wrap items-center gap-1">
              {issue.replacements.map((replacement) => (
                <button
                  key={replacement}
                  type="button"
                  onClick={() => onApply(issue, replacement)}
                  className="rounded-md border border-border bg-surface px-2 py-0.5 text-xs font-semibold text-brand-700 transition-colors hover:bg-brand-50 dark:text-brand-300 dark:hover:bg-brand-950/40"
                >
                  {replacement}
                </button>
              ))}
              <button
                type="button"
                onClick={() => onIgnore(issue)}
                className="rounded-md px-2 py-0.5 text-xs font-semibold text-foreground/45 transition-colors hover:text-foreground"
              >
                {t.editor.ignore}
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function Toolbar({
  editor,
  grammarEnabled,
  checking,
  checkLanguage,
  onLanguageChange,
  onToggleGrammar,
}: {
  editor: Editor;
  grammarEnabled: boolean;
  checking: boolean;
  checkLanguage: string;
  onLanguageChange: (value: string) => void;
  onToggleGrammar: () => void;
}) {
  const t = useT();
  const e = t.editor;
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");

  const state = useEditorState({
    editor,
    selector: ({ editor: instance }) => ({
      bold: instance.isActive("bold"),
      italic: instance.isActive("italic"),
      underline: instance.isActive("underline"),
      strike: instance.isActive("strike"),
      code: instance.isActive("code"),
      bulletList: instance.isActive("bulletList"),
      orderedList: instance.isActive("orderedList"),
      blockquote: instance.isActive("blockquote"),
      codeBlock: instance.isActive("codeBlock"),
      link: instance.isActive("link"),
      highlight: instance.isActive("highlight"),
      alignLeft: instance.isActive({ textAlign: "left" }),
      alignCenter: instance.isActive({ textAlign: "center" }),
      alignRight: instance.isActive({ textAlign: "right" }),
      block: instance.isActive("heading", { level: 1 })
        ? "h1"
        : instance.isActive("heading", { level: 2 })
          ? "h2"
          : instance.isActive("heading", { level: 3 })
            ? "h3"
            : "p",
      canUndo: instance.can().undo(),
      canRedo: instance.can().redo(),
    }),
  });

  function openLink() {
    setLinkUrl(editor.getAttributes("link").href ?? "");
    setLinkOpen((value) => !value);
  }

  function applyLink() {
    const raw = linkUrl.trim();
    if (!raw) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      setLinkOpen(false);
      return;
    }
    const href = /^(https?:|mailto:|tel:|\/|#)/i.test(raw) ? raw : `https://${raw}`;
    editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
    setLinkOpen(false);
  }

  return (
    <div className="relative flex items-center gap-0.5 overflow-x-auto border-b border-border bg-surface-muted/40 px-1.5 py-1">
      <ToolbarButton icon={Undo2} label={e.undo} onClick={() => editor.chain().focus().undo().run()} disabled={!state.canUndo} />
      <ToolbarButton icon={Redo2} label={e.redo} onClick={() => editor.chain().focus().redo().run()} disabled={!state.canRedo} />
      <Divider />

      <select
        value={state.block}
        onChange={(event) => {
          const value = event.target.value;
          if (value === "p") {
            editor.chain().focus().setParagraph().run();
          } else {
            const level = Number(value.slice(1)) as 1 | 2 | 3;
            editor.chain().focus().setHeading({ level }).run();
          }
        }}
        aria-label={e.blockStyle}
        className="h-7 shrink-0 rounded-md border border-border bg-background px-1.5 text-xs font-semibold text-foreground/70 outline-none focus:border-brand-400"
      >
        <option value="p">{e.paragraph}</option>
        <option value="h1">{e.heading1}</option>
        <option value="h2">{e.heading2}</option>
        <option value="h3">{e.heading3}</option>
      </select>
      <Divider />

      <ToolbarButton icon={Bold} label={e.bold} active={state.bold} onClick={() => editor.chain().focus().toggleBold().run()} />
      <ToolbarButton icon={Italic} label={e.italic} active={state.italic} onClick={() => editor.chain().focus().toggleItalic().run()} />
      <ToolbarButton icon={Underline} label={e.underline} active={state.underline} onClick={() => editor.chain().focus().toggleUnderline().run()} />
      <ToolbarButton icon={Strikethrough} label={e.strike} active={state.strike} onClick={() => editor.chain().focus().toggleStrike().run()} />
      <ToolbarButton icon={Code} label={e.code} active={state.code} onClick={() => editor.chain().focus().toggleCode().run()} />
      <ToolbarButton icon={Highlighter} label={e.highlight} active={state.highlight} onClick={() => editor.chain().focus().toggleHighlight().run()} />
      <Divider />

      <ToolbarButton icon={List} label={e.bulletList} active={state.bulletList} onClick={() => editor.chain().focus().toggleBulletList().run()} />
      <ToolbarButton icon={ListOrdered} label={e.orderedList} active={state.orderedList} onClick={() => editor.chain().focus().toggleOrderedList().run()} />
      <ToolbarButton icon={Quote} label={e.blockquote} active={state.blockquote} onClick={() => editor.chain().focus().toggleBlockquote().run()} />
      <ToolbarButton icon={SquareCode} label={e.codeBlock} active={state.codeBlock} onClick={() => editor.chain().focus().toggleCodeBlock().run()} />
      <ToolbarButton icon={Minus} label={e.horizontalRule} onClick={() => editor.chain().focus().setHorizontalRule().run()} />
      <Divider />

      <ToolbarButton icon={AlignLeft} label={e.alignLeft} active={state.alignLeft} onClick={() => editor.chain().focus().setTextAlign("left").run()} />
      <ToolbarButton icon={AlignCenter} label={e.alignCenter} active={state.alignCenter} onClick={() => editor.chain().focus().setTextAlign("center").run()} />
      <ToolbarButton icon={AlignRight} label={e.alignRight} active={state.alignRight} onClick={() => editor.chain().focus().setTextAlign("right").run()} />
      <Divider />

      <div className="relative shrink-0">
        <ToolbarButton icon={Link2} label={e.link} active={state.link} onClick={openLink} />
        {linkOpen ? (
          <div className="absolute left-0 top-8 z-30 flex w-64 items-center gap-1 rounded-lg border border-border bg-surface p-1.5 shadow-lg">
            <input
              autoFocus
              value={linkUrl}
              onChange={(event) => setLinkUrl(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  applyLink();
                }
                if (event.key === "Escape") setLinkOpen(false);
              }}
              placeholder={e.linkPlaceholder}
              className="h-8 min-w-0 flex-1 rounded-md border border-border bg-background px-2 text-xs text-foreground outline-none focus:border-brand-400"
            />
            <button
              type="button"
              onClick={applyLink}
              className="h-8 shrink-0 rounded-md brand-gradient px-2.5 text-xs font-semibold text-white"
            >
              {e.apply}
            </button>
          </div>
        ) : null}
      </div>

      <ToolbarButton
        icon={RemoveFormatting}
        label={e.clearFormat}
        onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
      />
      <div className="ml-auto flex shrink-0 items-center gap-0.5 pl-2">
        {grammarEnabled ? (
          <select
            value={checkLanguage}
            onChange={(event) => onLanguageChange(event.target.value)}
            aria-label={e.checkLanguage}
            title={e.checkLanguage}
            className="h-7 shrink-0 rounded-md border border-border bg-background px-1.5 text-xs font-medium text-foreground/70 outline-none focus:border-brand-400"
          >
            <option value="auto">{e.languageAuto}</option>
            <option value="es">{e.languageEs}</option>
            <option value="en-US">{e.languageEn}</option>
          </select>
        ) : null}
        <Divider />
        <ToolbarButton
          icon={checking ? Loader2 : Sparkles}
          label={e.checkGrammar}
          active={grammarEnabled}
          spin={checking}
          onClick={onToggleGrammar}
        />
      </div>
    </div>
  );
}

function ToolbarButton({
  icon: Icon,
  label,
  active,
  disabled,
  spin,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  disabled?: boolean;
  spin?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active ?? false}
      disabled={disabled}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={cn(
        "flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors disabled:opacity-30",
        active
          ? "bg-brand-100 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300"
          : "text-foreground/55 hover:bg-surface-muted hover:text-foreground",
      )}
    >
      <Icon className={cn("h-3.5 w-3.5", spin && "animate-spin")} />
    </button>
  );
}

function Divider() {
  return <span aria-hidden className="mx-0.5 h-5 w-px shrink-0 bg-border" />;
}

/* -------------------------------------------------------------------------- */
/* Doc → flat text mapping (for grammar offsets)                              */
/* -------------------------------------------------------------------------- */

type MapEntry = { start: number; pos: number; len: number };

function flattenDoc(doc: ProseMirrorNode): { text: string; map: MapEntry[] } {
  let text = "";
  const map: MapEntry[] = [];
  doc.descendants((node, pos) => {
    if (node.isText && node.text) {
      map.push({ start: text.length, pos, len: node.text.length });
      text += node.text;
    } else if (node.isBlock && node.type.name !== "doc" && text.length > 0) {
      // Separator between blocks only — never a leading one, which would shift
      // every offset.
      text += "\n";
    }
  });
  return { text, map };
}

function mapPosition(map: MapEntry[], offset: number): number | null {
  for (const entry of map) {
    if (offset >= entry.start && offset <= entry.start + entry.len) {
      return entry.pos + (offset - entry.start);
    }
  }
  const last = map[map.length - 1];
  return last ? last.pos + last.len : null;
}

/** Keeps the whitespace that LanguageTool's match may have included, so a
 * replacement never eats a space and merges two words. */
function replacementPreservingSpace(
  editor: Editor,
  issue: UiIssue,
  replacement: string,
): string {
  const matched = editor.state.doc.textBetween(
    issue.from,
    issue.to,
    "\n",
    "\n",
  );
  const leading = matched.match(/^\s*/)?.[0] ?? "";
  const trailing = matched.match(/\s*$/)?.[0] ?? "";
  if (leading.length + trailing.length >= matched.length) {
    return replacement;
  }
  return `${leading}${replacement}${trailing}`;
}

/* -------------------------------------------------------------------------- */
/* Read-only renderer                                                          */
/* -------------------------------------------------------------------------- */

/** Renders a ProseMirror JSON doc to React nodes. No `dangerouslySetInnerHTML`,
 * so even a tampered doc cannot inject markup or scripts. */
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
  if (align === "center" || align === "right" || align === "left") {
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
    default:
      return node.content ? (
        <span key={key}>{renderNodes(node.content)}</span>
      ) : null;
  }
}

function renderInline(nodes: RichTextNode[] | undefined): ReactNode {
  return renderNodes(nodes ?? []);
}

function safeHref(href: unknown): string | null {
  if (typeof href !== "string") return null;
  return /^(https?:|mailto:|tel:|\/|#)/i.test(href) ? href : null;
}

function applyMarks(
  text: string,
  marks: RichTextNode["marks"],
): ReactNode {
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
