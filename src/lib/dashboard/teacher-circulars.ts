import "server-only";

import { cache } from "react";
import { attachmentKind } from "@/lib/comms/attachment-mime";
import { getCommsActor } from "@/lib/dashboard/comms-session";

export type TeacherCircularRow = {
  id: string;
  title: string;
  description: string | null;
  categoryId: string | null;
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

/** Circulares this teacher has published (own author scope). `trash` lists deleted. */
export const loadTeacherCirculars = cache(
  async (trash = false): Promise<TeacherCircularRow[]> => {
    const session = await getCommsActor();
    if (!session) return [];

    const { data, error } = await session.actor.rpc("list_my_published_circulars", {
      p_trash: trash,
    });
    if (error || !data) return [];

    return (data as Array<Record<string, unknown>>).map((row) => ({
      id: String(row.id),
      title: String(row.title ?? ""),
      description: (row.description as string | null) ?? null,
      categoryId: (row.category_id as string | null) ?? null,
      categoryName: (row.category_name as string | null) ?? null,
      categoryColor: (row.category_color as string | null) ?? null,
      publishedAt: String(row.published_at ?? ""),
      targetCount: Number(row.target_count ?? 0),
    }));
  },
);

/** The teacher's own circular categories (independent from the school's). */
export const loadCircularCategories = cache(async (): Promise<CircularCategory[]> => {
  const session = await getCommsActor();
  if (!session) return [];

  const { data } = await session.actor
    .from("document_categories")
    .select("id, name, color")
    .eq("scope", "teacher")
    .eq("owner_profile_id", session.userId)
    .order("position", { ascending: true })
    .order("name", { ascending: true });
  return (data ?? []).map((row) => ({
    id: row.id as string,
    name: (row.name as string) ?? "",
    color: (row.color as string | null) ?? null,
  }));
});

/**
 * Detail for one circular the teacher published (including trashed rows, so the
 * trash reading pane works). Signs `school-documents` objects for the owner.
 */
export const loadTeacherCircularDetail = cache(
  async (documentId: string): Promise<TeacherCircularDetail | null> => {
    const session = await getCommsActor();
    if (!session) return null;

    const { data: rows, error } = await session.actor.rpc("get_my_circular_detail", {
      p_document_id: documentId,
    });
    if (error || !rows || rows.length === 0) return null;

    const first = rows[0] as Record<string, unknown>;
    const allRows = rows as Array<Record<string, unknown>>;
    const attachmentsRaw = allRows.filter((row) => row.attachment_id);

    const signedUrls = await Promise.all(
      attachmentsRaw.map(async (attachment) => {
        const { data: signed } = await session.actor.storage
          .from("school-documents")
          .createSignedUrl(attachment.attachment_path as string, 3600);
        return signed?.signedUrl ?? "";
      }),
    );

    return {
      id: first.id as string,
      title: first.title as string,
      description: (first.description as string | null) ?? null,
      categoryName: (first.category_name as string | null) ?? null,
      categoryColor: (first.category_color as string | null) ?? null,
      publishedAt: first.published_at as string,
      recipientsLabel: (first.recipients_label as string | null) ?? "",
      attachments: attachmentsRaw.map((attachment, index) => ({
        id: attachment.attachment_id as string,
        name: attachment.attachment_name as string,
        url: signedUrls[index] ?? "",
        mimeType: (attachment.attachment_mime as string | null) ?? null,
        sizeBytes: (attachment.attachment_size as number | null) ?? null,
        kind: attachmentKind(
          attachment.attachment_mime as string | null,
          attachment.attachment_name as string,
        ),
      })),
      recipientTargets: [],
    };
  },
);
