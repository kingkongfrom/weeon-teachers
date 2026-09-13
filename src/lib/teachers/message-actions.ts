"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSessionClient } from "@/lib/supabase/session";
import { getTeacherSession } from "@/lib/auth/teacher-session";
import { getT } from "@/lib/i18n/server";
import type { RichTextDoc } from "@/lib/assessments/model";

export type MessageActionResult =
  | { ok: true; threadId?: string }
  | { ok: false; error: string };

const docSchema = z.object({ type: z.literal("doc"), content: z.array(z.unknown()).optional() });

const composeSchema = z.object({
  subject: z.string().trim().max(160),
  body: docSchema,
  audience: z.enum(["individual", "group"]),
  classId: z.string().uuid().nullable(),
  recipientProfileIds: z.array(z.string().uuid()).max(200),
  allowReplies: z.boolean(),
});

export type ComposeMessageInput = z.input<typeof composeSchema>;

/** Creates an email-style thread (subject + rich body) and its first message. */
export async function createMessageThread(input: ComposeMessageInput): Promise<MessageActionResult> {
  const t = await getT();
  const session = await getTeacherSession();
  if (!session) return { ok: false, error: t.messages.error };

  const parsed = composeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: t.messages.error };
  const value = parsed.data;

  if (value.audience === "individual" && value.recipientProfileIds.length === 0) {
    return { ok: false, error: t.messages.noRecipients };
  }
  if (value.audience === "group" && !value.classId) {
    return { ok: false, error: t.messages.noRecipients };
  }

  const supabase = await createSessionClient();
  const { data, error } = await supabase.rpc("create_message_thread", {
    p_subject: value.subject,
    p_body: value.body as RichTextDoc,
    p_class_id: value.audience === "group" ? value.classId : null,
    p_audience: value.audience,
    p_recipient_profile_ids: value.audience === "group" ? [] : value.recipientProfileIds,
    p_allow_replies: value.allowReplies,
  });

  if (error || !data) return { ok: false, error: t.messages.error };

  revalidatePath("/comunicacion");
  return { ok: true, threadId: data as string };
}

/** Replies on a thread the teacher participates in. */
export async function sendThreadMessage(threadId: string, body: RichTextDoc): Promise<MessageActionResult> {
  const t = await getT();
  const session = await getTeacherSession();
  if (!session) return { ok: false, error: t.messages.error };

  const parsed = z
    .object({ threadId: z.string().uuid(), body: docSchema })
    .safeParse({ threadId, body });
  if (!parsed.success) return { ok: false, error: t.messages.error };

  const supabase = await createSessionClient();
  const { error } = await supabase.from("messages").insert({
    thread_id: parsed.data.threadId,
    body: parsed.data.body,
  });
  if (error) return { ok: false, error: t.messages.error };

  await supabase
    .from("threads")
    .update({ last_message_at: new Date().toISOString() })
    .eq("id", parsed.data.threadId);

  revalidatePath(`/comunicacion/${parsed.data.threadId}`);
  revalidatePath("/comunicacion");
  return { ok: true, threadId: parsed.data.threadId };
}

/** Marks the teacher's copy of a thread as read. */
export async function markThreadRead(threadId: string): Promise<MessageActionResult> {
  const t = await getT();
  const session = await getTeacherSession();
  if (!session) return { ok: false, error: t.messages.error };
  if (!z.string().uuid().safeParse(threadId).success) return { ok: false, error: t.messages.error };

  const supabase = await createSessionClient();
  await supabase
    .from("thread_recipients")
    .update({ read_at: new Date().toISOString() })
    .eq("thread_id", threadId);

  revalidatePath("/comunicacion");
  return { ok: true };
}

const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024;

/** Uploads a file to the private bucket and records it against a thread. */
export async function uploadMessageAttachment(formData: FormData): Promise<MessageActionResult> {
  const t = await getT();
  const session = await getTeacherSession();
  if (!session) return { ok: false, error: t.messages.error };

  const threadId = String(formData.get("threadId") ?? "");
  const messageId = formData.get("messageId");
  const file = formData.get("file");
  if (!z.string().uuid().safeParse(threadId).success || !(file instanceof File)) {
    return { ok: false, error: t.messages.error };
  }
  if (file.size > MAX_ATTACHMENT_BYTES) {
    return { ok: false, error: t.messages.attachmentTooLarge };
  }

  const safeName = file.name.replace(/[^\w.\-]+/g, "_").slice(-120) || "archivo";
  const path = `${session.tenantId}/${threadId}/${crypto.randomUUID()}-${safeName}`;
  const supabase = await createSessionClient();

  const { error: uploadError } = await supabase.storage
    .from("message-attachments")
    .upload(path, file, { contentType: file.type || "application/octet-stream", upsert: false });
  if (uploadError) return { ok: false, error: t.messages.error };

  const { error } = await supabase.from("message_attachments").insert({
    thread_id: threadId,
    message_id: typeof messageId === "string" && messageId ? messageId : null,
    uploader_profile_id: session.userId,
    file_name: file.name,
    storage_path: path,
    mime_type: file.type || null,
    size_bytes: file.size,
  });
  if (error) return { ok: false, error: t.messages.error };

  revalidatePath(`/comunicacion/${threadId}`);
  revalidatePath("/comunicacion");
  return { ok: true, threadId };
}
