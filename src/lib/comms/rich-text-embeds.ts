import type { RichTextDoc, RichTextNode } from "@/lib/comms/model";
import { attachmentKind } from "@/lib/comms/attachment-mime";

export const MESSAGE_EMBED_BUCKET = "message-attachments";
export const MESSAGE_EMBED_MAX_BYTES = 20 * 1024 * 1024;

export type CommsEmbedRef = {
  path: string;
  fileName: string;
  mimeType: string;
  kind: "image" | "file";
};

function mapDoc(doc: RichTextDoc, fn: (node: RichTextNode) => RichTextNode): RichTextDoc {
  const visit = (node: RichTextNode): RichTextNode => {
    const next: RichTextNode = {
      ...node,
      attrs: node.attrs ? { ...node.attrs } : undefined,
      content: node.content?.map(visit),
    };
    return fn(next);
  };
  return { type: "doc", content: (doc.content ?? []).map(visit) };
}

export function safeEmbedFileName(name: string): string {
  const base = name.replace(/\\/g, "/").split("/").pop() ?? "archivo";
  const cleaned = base
    .replace(/[^\w.\-() ]+/g, "_")
    .replace(/\s+/g, " ")
    .trim();
  return (cleaned || "archivo").slice(0, 120);
}

/** Draft upload while composing (before a thread exists). */
export function commsDraftEmbedPath(input: {
  tenantId: string;
  userId: string;
  fileName: string;
}): string {
  return `${input.tenantId}/draft/${input.userId}/${crypto.randomUUID()}-${safeEmbedFileName(input.fileName)}`;
}

/** Final object path after the circular is sent. */
export function commsThreadEmbedPath(input: {
  tenantId: string;
  threadId: string;
  fileName: string;
}): string {
  return `${input.tenantId}/${input.threadId}/${crypto.randomUUID()}-${safeEmbedFileName(input.fileName)}`;
}

export function isDraftEmbedPath(path: string): boolean {
  return /\/draft\//.test(path);
}

export function threadIdFromFinalEmbedPath(path: string): string | null {
  const match = path.match(/^[^/]+\/([0-9a-f-]{36})\//i);
  return match?.[1] ?? null;
}

/** Every storage path referenced inline in the doc. */
export function collectEmbedPaths(doc: RichTextDoc | null | undefined): string[] {
  const paths = new Set<string>();
  const walk = (nodes: RichTextNode[] | undefined) => {
    for (const node of nodes ?? []) {
      if (node.type === "image" || node.type === "fileEmbed") {
        const path = node.attrs?.path;
        if (typeof path === "string" && path.length > 0) paths.add(path);
      }
      walk(node.content);
    }
  };
  walk(doc?.content);
  return [...paths];
}

export function collectEmbedRefs(doc: RichTextDoc | null | undefined): CommsEmbedRef[] {
  const refs: CommsEmbedRef[] = [];
  const seen = new Set<string>();
  const walk = (nodes: RichTextNode[] | undefined) => {
    for (const node of nodes ?? []) {
      if (node.type === "image" || node.type === "fileEmbed") {
        const path = node.attrs?.path;
        if (typeof path !== "string" || !path || seen.has(path)) {
          walk(node.content);
          continue;
        }
        seen.add(path);
        const fileName =
          (typeof node.attrs?.fileName === "string" && node.attrs.fileName) ||
          (typeof node.attrs?.alt === "string" && node.attrs.alt) ||
          "Archivo";
        const mimeType =
          (typeof node.attrs?.mimeType === "string" && node.attrs.mimeType) ||
          (node.type === "image" ? "image/jpeg" : "application/octet-stream");
        refs.push({
          path,
          fileName,
          mimeType,
          kind: node.type === "image" ? "image" : "file",
        });
      }
      walk(node.content);
    }
  };
  walk(doc?.content);
  return refs;
}

/** Inject signed URLs for editor / detail rendering (`attrs.src`). */
export function injectEmbedUrls(
  doc: RichTextDoc | null | undefined,
  urlByPath: Map<string, string>,
): RichTextDoc | null {
  if (!doc) return null;
  return mapDoc(doc, (node) => {
    if ((node.type === "image" || node.type === "fileEmbed") && node.attrs) {
      const path = node.attrs.path;
      const url = typeof path === "string" ? urlByPath.get(path) : undefined;
      if (url) node.attrs = { ...node.attrs, src: url };
    }
    return node;
  });
}

/** Remove transient signed URLs before persisting. */
export function stripEmbedUrls(doc: RichTextDoc | null | undefined): RichTextDoc | null {
  if (!doc) return null;
  return mapDoc(doc, (node) => {
    if ((node.type === "image" || node.type === "fileEmbed") && node.attrs) {
      const attrs = { ...node.attrs };
      delete attrs.src;
      node.attrs = attrs;
    }
    return node;
  });
}

/** Rewrite draft storage paths to thread paths (returns updated doc + move pairs). */
export function remapEmbedPaths(
  doc: RichTextDoc,
  pathMap: Map<string, string>,
): RichTextDoc {
  return mapDoc(doc, (node) => {
    if ((node.type === "image" || node.type === "fileEmbed") && node.attrs) {
      const path = node.attrs.path;
      if (typeof path === "string") {
        const next = pathMap.get(path);
        if (next) node.attrs = { ...node.attrs, path: next, src: undefined };
      }
    }
    return node;
  });
}

export function embedKindFromMime(mimeType: string, fileName: string): "image" | "file" {
  return attachmentKind(mimeType, fileName) === "image" ? "image" : "file";
}
