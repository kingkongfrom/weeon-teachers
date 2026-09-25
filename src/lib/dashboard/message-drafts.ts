import "server-only";

import { docToPlainText, type RichTextDoc } from "@/lib/comms/model";
import type { MessageDraftRecord, MessageDraftSummary } from "@/lib/comms/message-draft";
import { getCommsActor } from "@/lib/dashboard/comms-session";

export type { MessageDraftRecord, MessageDraftSummary };

export async function loadMessageDrafts(): Promise<MessageDraftSummary[]> {
  const session = await getCommsActor();
  if (!session) return [];
  const { data, error } = await session.actor
    .from("message_drafts")
    .select("id, subject, payload, updated_at")
    .order("updated_at", { ascending: false });
  if (error || !data) return [];
  return data.map((row) => {
    const payload = row.payload as { body?: RichTextDoc } | null;
    return {
      id: row.id,
      subject: row.subject,
      preview: docToPlainText(payload?.body).slice(0, 140),
      updatedAt: row.updated_at,
    };
  });
}

export async function loadMessageDraft(id: string): Promise<MessageDraftRecord | null> {
  const session = await getCommsActor();
  if (!session) return null;
  const { data, error } = await session.actor
    .from("message_drafts")
    .select("id, subject, payload")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  const payload = data.payload as Partial<MessageDraftRecord> | null;
  return {
    id: data.id,
    subject: data.subject,
    body: payload?.body ?? { type: "doc", content: [{ type: "paragraph" }] },
    toSelected: Array.isArray(payload?.toSelected) ? payload.toSelected : [],
    ccSelected: Array.isArray(payload?.ccSelected) ? payload.ccSelected : [],
    allowReplies: payload?.allowReplies === true,
  };
}
