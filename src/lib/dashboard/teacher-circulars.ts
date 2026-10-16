import "server-only";

import { cache } from "react";
import { attachmentKind } from "@/lib/comms/attachment-mime";
import { getCommsActor } from "@/lib/dashboard/comms-session";

export type TeacherCircularRow = {
  id: string;
  title: string;
  description: string | null;
  categoryName: string | null;
  categoryColor: string | null;
  publishedAt: string;
  targetCount: number;
};

export type CircularCategory = {
  id: string;
  name: string;
  color: string | null;
};

export type TeacherCircularAttachment = {
  id: string;
  name: string;
  url: string;
  mimeType: string | null;
  sizeBytes: number | null;
  kind: "image" | "pdf" | "document" | "other";
};

export type TeacherCircularDetail = {
  id: string;
  title: string;
  description: string | null;
  categoryName: string | null;
  categoryColor: string | null;
  publishedAt: string;
  recipientsLabel: string;
  attachments: TeacherCircularAttachment[];
  recipientTargets: Array<{ key: string; name: string }>;
};

/** Circulares this teacher has published (own author scope). */
export const loadTeacherCirculars = cache(async (): Promise<TeacherCircularRow[]> => {
  const session = await getCommsActor();
  if (!session) return [];

  const { data, error } = await session.actor.rpc("list_my_published_circulars");
  if (error || !data) return [];

  return (data as Array<Record<string, unknown>>).map((row) => ({
    id: String(row.id),
    title: String(row.title ?? ""),
    description: (row.description as string | null) ?? null,
    categoryName: (row.category_name as string | null) ?? null,
    categoryColor: (row.category_color as string | null) ?? null,
    publishedAt: String(row.published_at ?? ""),
    targetCount: Number(row.target_count ?? 0),
  }));
});

/** Categories available to file a circular under. */
export const loadCircularCategories = cache(async (): Promise<CircularCategory[]> => {
  const session = await getCommsActor();
  if (!session) return [];

  const { data } = await session.actor
    .from("document_categories")
    .select("id, name, color")
    .order("name", { ascending: true });
  return (data ?? []).map((row) => ({
    id: row.id as string,
    name: (row.name as string) ?? "",
    color: (row.color as string | null) ?? null,
  }));
});

function categoryEmbed(value: unknown): { name: string; color: string } | null {
  const row = Array.isArray(value) ? value[0] : value;
  if (!row || typeof row !== "object") return null;
  const name = "name" in row && typeof row.name === "string" ? row.name : "";
  const color = "color" in row && typeof row.color === "string" ? row.color : "";
  if (!name && !color) return null;
  return { name, color };
}

const TARGET_KIND_LABEL: Record<string, string> = {
  parents: "Encargados",
  students: "Estudiantes",
};

function formatRecipientsLabel(names: string[]): string {
  if (names.length === 0) return "";
  if (names.length <= 3) return names.join(", ");
  return `${names.slice(0, 3).join(", ")}…`;
}

/**
 * Detail for one circular the teacher published. Teacher RLS can only read
 * their own `published_documents` rows, and the migration grants read access to
 * the matching `school-documents` object, so signing the stored path succeeds.
 */
export const loadTeacherCircularDetail = cache(
  async (documentId: string): Promise<TeacherCircularDetail | null> => {
    const session = await getCommsActor();
    if (!session) return null;

    const { data: row, error } = await session.actor
      .from("published_documents")
      .select(
        `
        id,
        title,
        description,
        published_at,
        category:document_categories ( name, color ),
        document_recipient_targets ( recipient_key, display_name ),
        document_attachments ( id, file_name, storage_path, mime_type, size_bytes, position )
      `,
      )
      .eq("id", documentId)
      .eq("published_by", session.userId)
      .eq("tenant_id", session.tenantId)
      .is("deleted_at", null)
      .maybeSingle();

    if (error || !row) return null;

    const attachmentsRaw = [...(row.document_attachments ?? [])].sort(
      (a, b) => (a.position as number) - (b.position as number),
    );

    const signedUrls = await Promise.all(
      attachmentsRaw.map(async (attachment) => {
        const { data: signed } = await session.actor.storage
          .from("school-documents")
          .createSignedUrl(attachment.storage_path as string, 3600);
        return signed?.signedUrl ?? "";
      }),
    );

    const category = categoryEmbed(row.category);
    const recipients = (row.document_recipient_targets ?? []) as Array<{
      recipient_key: string;
      display_name: string;
    }>;
    const recipientNames = recipients.map(
      (target) => TARGET_KIND_LABEL[target.display_name] ?? target.display_name,
    );

    return {
      id: row.id as string,
      title: row.title as string,
      description: (row.description as string | null) ?? null,
      categoryName: category?.name ?? null,
      categoryColor: category?.color ?? null,
      publishedAt: row.published_at as string,
      recipientsLabel: formatRecipientsLabel(recipientNames),
      attachments: attachmentsRaw.map((attachment, index) => ({
        id: attachment.id as string,
        name: attachment.file_name as string,
        url: signedUrls[index] ?? "",
        mimeType: (attachment.mime_type as string | null) ?? null,
        sizeBytes: (attachment.size_bytes as number | null) ?? null,
        kind: attachmentKind(
          attachment.mime_type as string | null,
          attachment.file_name as string,
        ),
      })),
      recipientTargets: recipients.map((target) => ({
        key: target.recipient_key,
        name: TARGET_KIND_LABEL[target.display_name] ?? target.display_name,
      })),
    };
  },
);
