import type { RichTextDoc, RichTextNode } from "@/lib/assessments/model";

/** Images are stored as ProseMirror `image` nodes with `attrs.path` (the
 * Supabase object path) and `attrs.alt`. `attrs.src` is a *transient* signed
 * URL: injected when a doc is loaded for rendering/editing and stripped again
 * before it is persisted, because signed URLs expire. Docs live in
 * `assessments.instructions` / `content.questions[].prompt` (JSONB). */

/** Reuses the class bucket: its RLS is path-shaped
 * `{tenant}/{class_id}/…` — teacher writes, any class member (student/parent)
 * reads — and its MIME allowlist already covers images. */
export const ASSESSMENT_IMAGE_BUCKET = "class-materials";
export const ASSESSMENT_IMAGE_MAX_BYTES = 10 * 1024 * 1024;
export const ASSESSMENT_IMAGE_MIME = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
] as const;

export function isAllowedAssessmentImage(file: { type: string }): boolean {
  return (ASSESSMENT_IMAGE_MIME as readonly string[]).includes(file.type);
}

/** Strips directories and unsafe characters; keeps the extension. */
export function safeImageName(name: string): string {
  const base = name.replace(/\\/g, "/").split("/").pop() ?? "imagen";
  const cleaned = base
    .replace(/[^\w.\-() ]+/g, "_")
    .replace(/\s+/g, " ")
    .trim();
  return (cleaned || "imagen").slice(0, 120);
}

/** Object path for an inline assessment image. */
export function assessmentImagePath(input: {
  tenantId: string;
  classId: string;
  assessmentId: string;
  fileName: string;
}): string {
  return `${input.tenantId}/${input.classId}/assessments/${input.assessmentId}/${crypto.randomUUID()}-${safeImageName(input.fileName)}`;
}

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

/** Every distinct storage path referenced by the doc. */
export function collectImagePaths(doc: RichTextDoc | null | undefined): string[] {
  const paths = new Set<string>();
  const walk = (nodes: RichTextNode[] | undefined) => {
    for (const node of nodes ?? []) {
      if (node.type === "image") {
        const path = node.attrs?.path;
        if (typeof path === "string" && path.length > 0) paths.add(path);
      }
      walk(node.content);
    }
  };
  walk(doc?.content);
  return [...paths];
}

/** Copies the doc with `attrs.src` set from `urlByPath` (load-time rendering). */
export function injectImageUrls(
  doc: RichTextDoc | null | undefined,
  urlByPath: Map<string, string>,
): RichTextDoc | null {
  if (!doc) return null;
  return mapDoc(doc, (node) => {
    if (node.type === "image") {
      const path = node.attrs?.path;
      const url = typeof path === "string" ? urlByPath.get(path) : undefined;
      if (url) node.attrs = { ...node.attrs, src: url };
    }
    return node;
  });
}

/** Copies the doc with the transient `attrs.src` removed (before persisting). */
export function stripImageUrls(doc: RichTextDoc | null | undefined): RichTextDoc | null {
  if (!doc) return null;
  return mapDoc(doc, (node) => {
    if (node.type === "image" && node.attrs) {
      const attrs = { ...node.attrs };
      delete attrs.src;
      node.attrs = attrs;
    }
    return node;
  });
}
