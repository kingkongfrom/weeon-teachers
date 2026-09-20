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

/** CSS class on signature blocks when rendered or edited (tighter line height). */
export const SIGNATURE_BLOCK_CLASS = "rte-signature";

function tagSignatureBlocks(blocks: RichTextNode[]): RichTextNode[] {
  return blocks.map((node) => tagSignatureBlock(node));
}

function tagSignatureBlock(node: RichTextNode): RichTextNode {
  const withChildren = node.content
    ? { ...node, content: node.content.map(tagSignatureBlock) }
    : node;

  if (
    node.type === "paragraph" ||
    node.type === "heading" ||
    node.type === "bulletList" ||
    node.type === "orderedList" ||
    node.type === "blockquote"
  ) {
    const prior =
      typeof withChildren.attrs?.class === "string" ? withChildren.attrs.class.trim() : "";
    const merged = prior.includes(SIGNATURE_BLOCK_CLASS)
      ? prior
      : prior
        ? `${prior} ${SIGNATURE_BLOCK_CLASS}`
        : SIGNATURE_BLOCK_CLASS;
    return { ...withChildren, attrs: { ...withChildren.attrs, class: merged } };
  }

  return withChildren;
}

/** Append signature block after the message body (composer / replies). */
export function appendSignature(
  body: RichTextDoc,
  signature: RichTextDoc | null | undefined,
): RichTextDoc {
  if (!signature || !docHasContent(signature)) return body;
  const bodyBlocks = body.content ?? [];
  const signatureBlocks = tagSignatureBlocks(signature.content ?? []);
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
