/** ProseMirror JSON doc — same safe format as teacher circulares and mobile. */

export type RichTextMark = { type: string; attrs?: Record<string, unknown> };

export type RichTextNode = {
  type: string;
  attrs?: Record<string, unknown>;
  content?: RichTextNode[];
  text?: string;
  marks?: RichTextMark[];
};

export type RichTextDoc = { type: "doc"; content?: RichTextNode[] };

export function emptyDoc(): RichTextDoc {
  return { type: "doc", content: [{ type: "paragraph" }] };
}

/** Best-effort plain-text extraction (previews, validation). */
export function docHasContent(doc: RichTextDoc | null | undefined): boolean {
  return docToPlainText(doc).length > 0;
}

/** Append signature block after the message body (composer / replies). */
export function appendSignature(
  body: RichTextDoc,
  signature: RichTextDoc | null | undefined,
): RichTextDoc {
  if (!signature || !docHasContent(signature)) return body;
  const bodyBlocks = body.content ?? [];
  const signatureBlocks = signature.content ?? [];
  return {
    type: "doc",
    content: [...bodyBlocks, { type: "paragraph" }, ...signatureBlocks],
  };
}

export function docToPlainText(doc: RichTextDoc | null | undefined): string {
  if (!doc?.content) return "";
  const parts: string[] = [];
  const walk = (nodes: RichTextNode[] | undefined) => {
    for (const node of nodes ?? []) {
      if (node.text) parts.push(node.text);
      if (node.content) walk(node.content);
      if (node.type === "paragraph" || node.type === "listItem") parts.push(" ");
    }
  };
  walk(doc.content);
  return parts.join("").replace(/\s+/g, " ").trim();
}
