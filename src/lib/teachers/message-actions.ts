"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSessionClient } from "@/lib/supabase/session";
import { getTeacherSession } from "@/lib/auth/teacher-session";
import { getT } from "@/lib/i18n/server";
import type { RichTextDoc } from "@/lib/assessments/model";
import { TEACHER_MESSAGES } from "@/lib/messages/paths";

function revalidateMessagePaths(threadId?: string) {
  revalidatePath(TEACHER_MESSAGES);
  if (threadId) revalidatePath(`${TEACHER_MESSAGES}/${threadId}`);
}

export type MessageActionResult =
  | { ok: true; threadId?: string }
  | { ok: false; error: string };

const docSchema = z.object({ type: z.literal("doc"), content: z.array(z.unknown()).optional() });

const composeSchema = z.object({
  subject: z.string().trim().min(1).max(160),
  body: docSchema,
  audience: z.enum(["individual", "group"]),
  classId: z.string().uuid().nullable(),
  recipientScope: z.enum(["parents", "students"]).nullable(),
  recipients: z
    .array(z.object({ key: z.string().trim().min(1), name: z.string().trim().max(200) }))
    .max(300),
  allowReplies: z.boolean(),
});

export type ComposeMessageInput = z.input<typeof composeSchema>;

/** Creates a message thread (subject + rich body) and its first message. */
export async function createMessageThread(input: ComposeMessageInput): Promise<MessageActionResult> {
  const t = await getT();
  const session = await getTeacherSession();
  if (!session) return { ok: false, error: t.messages.error };

  const parsed = composeSchema.safeParse(input);
  if (!parsed.success) {
    const missingSubject = parsed.error.issues.some((issue) => issue.path[0] === "subject");
    return { ok: false, error: missingSubject ? t.messages.subjectRequired : t.messages.error };
  }
  const value = parsed.data;

  if (value.audience === "individual" && value.recipients.length === 0) {
    return { ok: false, error: t.messages.noRecipients };
  }
  if (value.audience === "group" && !value.classId) {
    return { ok: false, error: t.messages.noRecipients };
  }
  if (value.audience === "group" && value.recipients.length === 0 && !value.recipientScope) {
    return { ok: false, error: t.messages.noRecipients };
  }

  const supabase = await createSessionClient();
  const scope =
    value.audience === "group" && value.recipients.length === 0 ? value.recipientScope : null;
  const { data, error } = await supabase.rpc("create_message_thread", {
    p_subject: value.subject,
    p_body: value.body as RichTextDoc,
    p_class_id: value.audience === "group" ? value.classId : null,
    p_audience: value.audience,
    p_recipients: value.recipients,
    p_allow_replies: value.allowReplies,
    ...(scope ? { p_recipient_scope: scope } : {}),
  });

  if (error || !data) return { ok: false, error: t.messages.error };

  revalidateMessagePaths(data as string);
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
    tenant_id: session.tenantId,
    thread_id: parsed.data.threadId,
    author_profile_id: session.userId,
    body: parsed.data.body,
  });
  if (error) return { ok: false, error: t.messages.error };

  await supabase
    .from("threads")
    .update({ last_message_at: new Date().toISOString() })
    .eq("id", parsed.data.threadId);

  revalidateMessagePaths(parsed.data.threadId);
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

  revalidateMessagePaths();
  return { ok: true };
}

/** Moves a thread to a folder (inbox / sent / trash) for the signed-in user. */
export async function setThreadFolder(
  threadId: string,
  folder: "inbox" | "sent" | "trash",
): Promise<MessageActionResult> {
  const t = await getT();
  const session = await getTeacherSession();
  if (!session) return { ok: false, error: t.messages.error };

  const parsed = z
    .object({ threadId: z.string().uuid(), folder: z.enum(["inbox", "sent", "trash"]) })
    .safeParse({ threadId, folder });
  if (!parsed.success) return { ok: false, error: t.messages.error };

  const supabase = await createSessionClient();
  const { error } = await supabase.from("message_thread_state").upsert(
    {
      tenant_id: session.tenantId,
      owner_profile_id: session.userId,
      thread_id: parsed.data.threadId,
      folder: parsed.data.folder,
    },
    { onConflict: "owner_profile_id,thread_id" },
  );
  if (error) return { ok: false, error: t.messages.error };

  revalidateMessagePaths();
  return { ok: true };
}

/** Permanently deletes a thread the teacher authored (recipients lose access). */
export async function deleteMessageThread(threadId: string): Promise<MessageActionResult> {
  const t = await getT();
  const session = await getTeacherSession();
  if (!session) return { ok: false, error: t.messages.error };

  const parsed = z.string().uuid().safeParse(threadId);
  if (!parsed.success) return { ok: false, error: t.messages.error };

  const supabase = await createSessionClient();
  const { data: thread, error: fetchError } = await supabase
    .from("threads")
    .select("id, created_by")
    .eq("id", parsed.data)
    .maybeSingle();

  if (fetchError || !thread || thread.created_by !== session.userId) {
    return { ok: false, error: t.messages.deleteNotAllowed };
  }

  const { data: attachments } = await supabase
    .from("message_attachments")
    .select("storage_path")
    .eq("thread_id", parsed.data);

  const paths = (attachments ?? []).map((row) => row.storage_path).filter(Boolean);
  if (paths.length > 0) {
    await supabase.storage.from("message-attachments").remove(paths);
  }

  const { error } = await supabase.from("threads").delete().eq("id", parsed.data);
  if (error) return { ok: false, error: t.messages.error };

  revalidateMessagePaths();
  return { ok: true };
}

const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024;

function isUploadFile(value: FormDataEntryValue | null): value is File {
  return typeof value === "object" && value !== null && "size" in value && "name" in value;
}

/** Uploads a file to the private bucket and records it against a thread. */
export async function uploadMessageAttachment(formData: FormData): Promise<MessageActionResult> {
  const t = await getT();
  const session = await getTeacherSession();
  if (!session) return { ok: false, error: t.messages.error };

  const threadId = String(formData.get("threadId") ?? "");
  const messageId = formData.get("messageId");
  const file = formData.get("file");
  if (!z.string().uuid().safeParse(threadId).success || !isUploadFile(file) || file.size === 0) {
    return { ok: false, error: t.messages.attachmentUploadError };
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
  if (uploadError) return { ok: false, error: t.messages.attachmentUploadError };

  const { error } = await supabase.from("message_attachments").insert({
    tenant_id: session.tenantId,
    thread_id: threadId,
    message_id: typeof messageId === "string" && messageId ? messageId : null,
    uploader_profile_id: session.userId,
    file_name: file.name,
    storage_path: path,
    mime_type: file.type || null,
    size_bytes: file.size,
  });
  if (error) return { ok: false, error: t.messages.attachmentUploadError };

  revalidateMessagePaths(threadId);
  return { ok: true, threadId };
}
