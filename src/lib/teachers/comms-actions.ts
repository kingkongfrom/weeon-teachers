"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { inferAttachmentMimeType, isAllowedAttachmentMime } from "@/lib/comms/attachment-mime";
import { appendSignature, type RichTextDoc } from "@/lib/comms/model";
import { stripEmbedUrls } from "@/lib/comms/rich-text-embeds";
import { COMMS_MESSAGES } from "@/lib/comms/paths";
import { finalizeCommsEmbeds } from "@/lib/dashboard/comms-embed-actions";
import { getCommsActor } from "@/lib/dashboard/comms-session";
import { loadMessageMailboxSettingsForSession } from "@/lib/dashboard/message-mailbox-settings";
import { tRequest } from "@/lib/i18n/server";

export type CommsActionResult =
  | { ok: true; threadId?: string }
  | { ok: false; error: string };

const docSchema = z.object({ type: z.literal("doc"), content: z.array(z.unknown()).optional() });

const broadcastFilterSchema = z.object({
  reach: z.enum(["school", "cycle", "grade", "class"]),
  cycle: z.enum(["primaria", "secundaria"]).nullable(),
  grade: z.string().trim().max(4).nullable(),
  classId: z.string().uuid().nullable(),
  kind: z.enum(["parents", "students", "teachers"]),
});

const composeSchema = z.object({
  subject: z.string().trim().min(1).max(160),
  body: docSchema,
  audience: z.enum(["individual", "group"]),
  classId: z.string().uuid().nullable(),
  allowReplies: z.boolean(),
  recipientScope: z.enum(["parents", "students", "teachers"]).nullable(),
  broadcastFilter: broadcastFilterSchema.nullable(),
  recipients: z
    .array(
      z.object({
        key: z.string().trim().min(1),
        name: z.string().trim().max(200),
        role: z.enum(["to", "cc"]).optional(),
      }),
    )
    .max(500),
});

export type ComposeMessageInput = z.input<typeof composeSchema>;

function mapCommsRpcError(message: string | undefined, code?: string): string | null {
  if (!message) return null;
  if (message.includes("tenant_read_only")) {
    return "La institución está en modo solo lectura; no se pueden enviar circulares.";
  }
  if (message.includes("not_authenticated")) {
    return "Sesión expirada. Vuelva a iniciar sesión.";
  }
  if (message.includes("empty_body")) {
    return "Escriba un mensaje o inserte un archivo en el contenido.";
  }
  if (message.includes("invalid_recipient_scope")) {
    return "Seleccione destinatarios válidos para esta circular.";
  }
  if (
    code === "23514" ||
    message.includes("threads_recipient_scope_check") ||
    (message.includes("recipient_scope") && message.includes("check constraint"))
  ) {
    return "Falta una actualización de base de datos para circulares a docentes. Aplique la migración 20260919070000_teacher_recipient_scope.sql en Supabase.";
  }
  if (message.includes("Could not find the function") || message.includes("PGRST202")) {
    return "Faltan migraciones de Comunicación en Supabase. Aplique las migraciones 20260918* y 20260919* en weeon-tenants.";
  }
  return null;
}

function formatComposeValidationError(issues: z.ZodIssue[]): string | null {
  for (const issue of issues) {
    const path = issue.path.join(".");
    if (path.startsWith("broadcastFilter")) {
      return "Revise el alcance de la circular (grupo, grado o nivel seleccionado).";
    }
    if (path === "body") {
      return "El contenido del aviso no es válido. Intente de nuevo.";
    }
  }
  return null;
}

export async function createMessageThread(
  input: ComposeMessageInput,
): Promise<CommsActionResult> {
  const session = await getCommsActor();
  if (!session) return { ok: false, error: await tRequest("comms.error") };

  const parsed = composeSchema.safeParse(input);
  if (!parsed.success) {
    const missingSubject = parsed.error.issues.some((issue) => issue.path[0] === "subject");
    if (missingSubject) {
      return { ok: false, error: await tRequest("comms.subjectRequired") };
    }
    return {
      ok: false,
      error:
        formatComposeValidationError(parsed.error.issues) ?? (await tRequest("comms.error")),
    };
  }
  const value = parsed.data;

  if (value.audience === "individual" && value.recipients.length === 0) {
    return { ok: false, error: await tRequest("comms.noRecipientsPick") };
  }
  const usesBroadcast =
    value.audience === "group" &&
    value.recipients.length === 0 &&
    value.broadcastFilter != null &&
    !(value.broadcastFilter.reach === "class" && value.broadcastFilter.classId);

  if (value.audience === "group" && !value.classId && !usesBroadcast) {
    return { ok: false, error: await tRequest("comms.noRecipientsPick") };
  }
  if (
    value.audience === "group" &&
    value.recipients.length === 0 &&
    !value.recipientScope &&
    !usesBroadcast
  ) {
    return { ok: false, error: await tRequest("comms.noRecipientsPick") };
  }

  const scope =
    value.audience === "group" && value.recipients.length === 0 && !usesBroadcast
      ? value.recipientScope
      : null;
  const mailbox = await loadMessageMailboxSettingsForSession(session);
  const bodyWithSignature = appendSignature(value.body as RichTextDoc, mailbox.signatureBody);
  const persistedBody = (stripEmbedUrls(bodyWithSignature) ?? bodyWithSignature) as RichTextDoc;

  const { data, error } = await session.actor.rpc("create_message_thread", {
    p_subject: value.subject,
    p_body: persistedBody,
    p_class_id: value.audience === "group" && !usesBroadcast ? value.classId : null,
    p_audience: value.audience,
    p_recipients: value.recipients,
    p_allow_replies: value.allowReplies,
    ...(scope ? { p_recipient_scope: scope } : {}),
    ...(usesBroadcast && value.broadcastFilter
      ? { p_broadcast_filter: value.broadcastFilter }
      : {}),
  });

  if (error || !data) {
    return {
      ok: false,
      error:
        mapCommsRpcError(error?.message, error?.code) ?? (await tRequest("comms.error")),
    };
  }

  const threadId = data as string;
  await finalizeCommsEmbeds(threadId);

  revalidatePath(COMMS_MESSAGES);
  return { ok: true, threadId };
}

export async function sendThreadMessage(
  threadId: string,
  body: RichTextDoc,
): Promise<CommsActionResult> {
  const session = await getCommsActor();
  if (!session) return { ok: false, error: await tRequest("comms.error") };

  const parsed = z
    .object({ threadId: z.string().uuid(), body: docSchema })
    .safeParse({ threadId, body });
  if (!parsed.success) return { ok: false, error: await tRequest("comms.error") };

  const mailbox = await loadMessageMailboxSettingsForSession(session);
  const bodyWithSignature = appendSignature(parsed.data.body as RichTextDoc, mailbox.signatureBody);
  const persistedBody = (stripEmbedUrls(bodyWithSignature) ?? bodyWithSignature) as RichTextDoc;

  const { data: inserted, error } = await session.actor
    .from("messages")
    .insert({
      tenant_id: session.tenantId,
      thread_id: parsed.data.threadId,
      author_profile_id: session.userId,
      body: persistedBody,
    })
    .select("id")
    .single();
  if (error || !inserted) return { ok: false, error: await tRequest("comms.error") };

  await session.actor
    .from("threads")
    .update({ last_message_at: new Date().toISOString() })
    .eq("id", parsed.data.threadId);

  await finalizeCommsEmbeds(parsed.data.threadId, inserted.id as string);

  revalidatePath(`${COMMS_MESSAGES}/${parsed.data.threadId}`);
  revalidatePath(COMMS_MESSAGES);
  return { ok: true, threadId: parsed.data.threadId };
}

export async function markThreadRead(threadId: string): Promise<CommsActionResult> {
  const session = await getCommsActor();
  if (!session) return { ok: false, error: await tRequest("comms.error") };
  if (!z.string().uuid().safeParse(threadId).success) {
    return { ok: false, error: await tRequest("comms.error") };
  }

  await session.actor
    .from("thread_recipients")
    .update({ read_at: new Date().toISOString() })
    .eq("thread_id", threadId);

  revalidatePath(COMMS_MESSAGES);
  return { ok: true };
}

export async function setThreadFolder(
  threadId: string,
  folder: "inbox" | "sent" | "trash",
): Promise<CommsActionResult> {
  const session = await getCommsActor();
  if (!session) return { ok: false, error: await tRequest("comms.error") };

  const parsed = z
    .object({ threadId: z.string().uuid(), folder: z.enum(["inbox", "sent", "trash"]) })
    .safeParse({ threadId, folder });
  if (!parsed.success) return { ok: false, error: await tRequest("comms.error") };

  const patch: Record<string, unknown> = {
    tenant_id: session.tenantId,
    owner_profile_id: session.userId,
    thread_id: parsed.data.threadId,
    folder: parsed.data.folder,
    label_id: null,
  };
  if (parsed.data.folder === "trash") {
    patch.is_favorite = false;
  }

  const { error } = await session.actor.from("message_thread_state").upsert(patch, {
    onConflict: "owner_profile_id,thread_id",
  });
  if (error) return { ok: false, error: await tRequest("comms.error") };

  revalidatePath(COMMS_MESSAGES);
  return { ok: true };
}

export async function toggleThreadFavorite(
  threadId: string,
  favorite: boolean,
): Promise<CommsActionResult> {
  const session = await getCommsActor();
  if (!session) return { ok: false, error: await tRequest("comms.error") };

  const parsed = z
    .object({ threadId: z.string().uuid(), favorite: z.boolean() })
    .safeParse({ threadId, favorite });
  if (!parsed.success) return { ok: false, error: await tRequest("comms.error") };

  const { data: thread } = await session.actor
    .from("threads")
    .select("id, created_by")
    .eq("id", parsed.data.threadId)
    .maybeSingle();
  if (!thread) return { ok: false, error: await tRequest("comms.error") };

  const mine = thread.created_by === session.userId;
  const fallbackFolder = mine ? "sent" : "inbox";

  const { data: existing } = await session.actor
    .from("message_thread_state")
    .select("folder")
    .eq("owner_profile_id", session.userId)
    .eq("thread_id", parsed.data.threadId)
    .maybeSingle();

  const folder =
    existing?.folder === "inbox" || existing?.folder === "sent" || existing?.folder === "trash"
      ? existing.folder
      : fallbackFolder;

  const { error } = await session.actor.from("message_thread_state").upsert(
    {
      tenant_id: session.tenantId,
      owner_profile_id: session.userId,
      thread_id: parsed.data.threadId,
      folder,
      is_favorite: parsed.data.favorite,
    },
    { onConflict: "owner_profile_id,thread_id" },
  );
  if (error) return { ok: false, error: await tRequest("comms.error") };

  revalidatePath(COMMS_MESSAGES);
  return { ok: true };
}

export async function deleteMessageThread(threadId: string): Promise<CommsActionResult> {
  const session = await getCommsActor();
  if (!session) return { ok: false, error: await tRequest("comms.error") };

  const parsed = z.string().uuid().safeParse(threadId);
  if (!parsed.success) return { ok: false, error: await tRequest("comms.error") };

  const { data: thread, error: fetchError } = await session.actor
    .from("threads")
    .select("id, created_by")
    .eq("id", parsed.data)
    .maybeSingle();

  if (fetchError || !thread || thread.created_by !== session.userId) {
    return { ok: false, error: await tRequest("comms.deleteNotAllowed") };
  }

  const { data: attachments } = await session.actor
    .from("message_attachments")
    .select("storage_path")
    .eq("thread_id", parsed.data);

  const paths = (attachments ?? []).map((row) => row.storage_path).filter(Boolean);
  if (paths.length > 0) {
    await session.actor.storage.from("message-attachments").remove(paths);
  }

  const { error } = await session.actor.from("threads").delete().eq("id", parsed.data);
  if (error) return { ok: false, error: await tRequest("comms.error") };

  revalidatePath(COMMS_MESSAGES);
  return { ok: true };
}

const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024;

function isUploadFile(value: FormDataEntryValue | null): value is File {
  return typeof value === "object" && value !== null && "size" in value && "name" in value;
}

export async function uploadMessageAttachment(formData: FormData): Promise<CommsActionResult> {
  const session = await getCommsActor();
  if (!session) return { ok: false, error: await tRequest("comms.error") };

  const threadId = String(formData.get("threadId") ?? "");
  const messageId = formData.get("messageId");
  const file = formData.get("file");
  if (!z.string().uuid().safeParse(threadId).success || !isUploadFile(file) || file.size === 0) {
    return { ok: false, error: await tRequest("comms.attachmentUploadError") };
  }
  if (file.size > MAX_ATTACHMENT_BYTES) {
    return { ok: false, error: await tRequest("comms.attachmentTooLarge") };
  }

  const mimeType = inferAttachmentMimeType(file.name, file.type);
  if (!isAllowedAttachmentMime(mimeType)) {
    return { ok: false, error: await tRequest("comms.attachmentTypeNotAllowed") };
  }

  const safeName = file.name.replace(/[^\w.\-]+/g, "_").slice(-120) || "archivo";
  const path = `${session.tenantId}/${threadId}/${crypto.randomUUID()}-${safeName}`;

  const { error: uploadError } = await session.actor.storage
    .from("message-attachments")
    .upload(path, file, { contentType: mimeType, upsert: false });
  if (uploadError) return { ok: false, error: await tRequest("comms.attachmentUploadError") };

  const { error } = await session.actor.from("message_attachments").insert({
    tenant_id: session.tenantId,
    thread_id: threadId,
    message_id: typeof messageId === "string" && messageId ? messageId : null,
    uploader_profile_id: session.userId,
    file_name: file.name,
    storage_path: path,
    mime_type: mimeType,
    size_bytes: file.size,
  });
  if (error) return { ok: false, error: await tRequest("comms.attachmentUploadError") };

  revalidatePath(`${COMMS_MESSAGES}/${threadId}`);
  revalidatePath(COMMS_MESSAGES);
  return { ok: true, threadId };
}

const hexColorSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$/);

export async function createMessageLabel(input: {
  name: string;
  color: string;
}): Promise<CommsActionResult & { labelId?: string }> {
  const session = await getCommsActor();
  if (!session) return { ok: false, error: await tRequest("comms.error") };

  const parsed = z
    .object({ name: z.string().trim().min(1).max(60), color: hexColorSchema })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: await tRequest("comms.folderNameRequired") };

  const { data: lastLabel } = await session.actor
    .from("message_labels")
    .select("position")
    .eq("owner_profile_id", session.userId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const position = ((lastLabel?.position as number | undefined) ?? -1) + 1;

  const { data, error } = await session.actor
    .from("message_labels")
    .insert({
      tenant_id: session.tenantId,
      owner_profile_id: session.userId,
      name: parsed.data.name,
      color: parsed.data.color.toUpperCase(),
      position,
    })
    .select("id")
    .single();

  if (error || !data) {
    if (error?.code === "23505") {
      return { ok: false, error: await tRequest("comms.folderNameDuplicate") };
    }
    return { ok: false, error: await tRequest("comms.error") };
  }

  revalidatePath(COMMS_MESSAGES);
  return { ok: true, labelId: data.id as string };
}

export async function reorderMessageLabels(orderedIds: string[]): Promise<CommsActionResult> {
  const session = await getCommsActor();
  if (!session) return { ok: false, error: await tRequest("comms.error") };

  const parsed = z.array(z.string().uuid()).safeParse(orderedIds);
  if (!parsed.success || parsed.data.length === 0) {
    return { ok: false, error: await tRequest("comms.error") };
  }

  const { data: owned, error: loadError } = await session.actor
    .from("message_labels")
    .select("id")
    .eq("owner_profile_id", session.userId);

  if (loadError || !owned) return { ok: false, error: await tRequest("comms.error") };

  const ownedIds = new Set(owned.map((row) => row.id as string));
  const uniqueOrdered = [...new Set(parsed.data)];
  if (
    uniqueOrdered.length !== ownedIds.size ||
    uniqueOrdered.some((id) => !ownedIds.has(id))
  ) {
    return { ok: false, error: await tRequest("comms.error") };
  }

  const results = await Promise.all(
    uniqueOrdered.map((id, index) =>
      session.actor
        .from("message_labels")
        .update({ position: index })
        .eq("id", id)
        .eq("owner_profile_id", session.userId),
    ),
  );

  if (results.some((result) => result.error)) {
    return { ok: false, error: await tRequest("comms.error") };
  }

  revalidatePath(COMMS_MESSAGES);
  return { ok: true };
}

export async function deleteMessageLabel(labelId: string): Promise<CommsActionResult> {
  const session = await getCommsActor();
  if (!session) return { ok: false, error: await tRequest("comms.error") };
  if (!z.string().uuid().safeParse(labelId).success) {
    return { ok: false, error: await tRequest("comms.error") };
  }

  const { error } = await session.actor
    .from("message_labels")
    .delete()
    .eq("id", labelId)
    .eq("owner_profile_id", session.userId);

  if (error) return { ok: false, error: await tRequest("comms.error") };

  revalidatePath(COMMS_MESSAGES);
  return { ok: true };
}

export async function setThreadLabel(
  threadId: string,
  labelId: string | null,
): Promise<CommsActionResult> {
  const session = await getCommsActor();
  if (!session) return { ok: false, error: await tRequest("comms.error") };

  const parsed = z
    .object({ threadId: z.string().uuid(), labelId: z.string().uuid().nullable() })
    .safeParse({ threadId, labelId });
  if (!parsed.success) return { ok: false, error: await tRequest("comms.error") };

  if (parsed.data.labelId) {
    const { data: label } = await session.actor
      .from("message_labels")
      .select("id")
      .eq("id", parsed.data.labelId)
      .eq("owner_profile_id", session.userId)
      .maybeSingle();
    if (!label) return { ok: false, error: await tRequest("comms.error") };
  }

  const { data: thread } = await session.actor
    .from("threads")
    .select("id, created_by")
    .eq("id", parsed.data.threadId)
    .maybeSingle();
  if (!thread) return { ok: false, error: await tRequest("comms.error") };

  const mine = thread.created_by === session.userId;
  const fallbackFolder = mine ? "sent" : "inbox";

  const { data: existing } = await session.actor
    .from("message_thread_state")
    .select("folder")
    .eq("owner_profile_id", session.userId)
    .eq("thread_id", parsed.data.threadId)
    .maybeSingle();

  const folder =
    existing?.folder === "inbox" || existing?.folder === "sent" || existing?.folder === "trash"
      ? existing.folder
      : fallbackFolder;

  const { error } = await session.actor.from("message_thread_state").upsert(
    {
      tenant_id: session.tenantId,
      owner_profile_id: session.userId,
      thread_id: parsed.data.threadId,
      folder,
      label_id: parsed.data.labelId,
    },
    { onConflict: "owner_profile_id,thread_id" },
  );
  if (error) return { ok: false, error: await tRequest("comms.error") };

  revalidatePath(COMMS_MESSAGES);
  return { ok: true };
}

const mailboxSettingsSchema = z.object({
  signatureBody: docSchema.optional(),
  autoReplyEnabled: z.boolean().optional(),
  autoReplyStart: z.string().nullable().optional(),
  autoReplyEnd: z.string().nullable().optional(),
  autoReplyBody: docSchema.optional(),
});

export type SaveMailboxSettingsInput = z.input<typeof mailboxSettingsSchema>;

export async function saveMessageMailboxSettings(
  input: SaveMailboxSettingsInput,
): Promise<CommsActionResult> {
  const session = await getCommsActor();
  if (!session) return { ok: false, error: await tRequest("comms.error") };

  const parsed = mailboxSettingsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: await tRequest("comms.error") };

  const value = parsed.data;
  const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
  if (value.autoReplyStart && !dateSchema.safeParse(value.autoReplyStart).success) {
    return { ok: false, error: await tRequest("comms.autoReplyDateInvalid") };
  }
  if (value.autoReplyEnd && !dateSchema.safeParse(value.autoReplyEnd).success) {
    return { ok: false, error: await tRequest("comms.autoReplyDateInvalid") };
  }
  if (
    value.autoReplyEnabled &&
    value.autoReplyStart &&
    value.autoReplyEnd &&
    value.autoReplyStart > value.autoReplyEnd
  ) {
    return { ok: false, error: await tRequest("comms.autoReplyDateRangeInvalid") };
  }

  const patch: Record<string, unknown> = {
    tenant_id: session.tenantId,
    owner_profile_id: session.userId,
    updated_at: new Date().toISOString(),
  };
  if (value.signatureBody !== undefined) patch.signature_body = value.signatureBody;
  if (value.autoReplyEnabled !== undefined) patch.auto_reply_enabled = value.autoReplyEnabled;
  if (value.autoReplyStart !== undefined) patch.auto_reply_start = value.autoReplyStart;
  if (value.autoReplyEnd !== undefined) patch.auto_reply_end = value.autoReplyEnd;
  if (value.autoReplyBody !== undefined) patch.auto_reply_body = value.autoReplyBody;

  const { error } = await session.actor
    .from("message_mailbox_settings")
    .upsert(patch, { onConflict: "owner_profile_id" });
  if (error) return { ok: false, error: await tRequest("comms.error") };

  revalidatePath(COMMS_MESSAGES);
  return { ok: true };
}

export async function fetchThreadDetail(threadId: string) {
  const { loadThreadDetail } = await import("@/lib/dashboard/messages");
  return loadThreadDetail(threadId);
}

const draftSchema = z.object({
  id: z.string().uuid().nullable(),
  subject: z.string().max(160),
  body: docSchema,
  toSelected: z.array(z.unknown()).max(80),
  ccSelected: z.array(z.object({ key: z.string().max(200), name: z.string().max(200) })).max(80),
  allowReplies: z.boolean(),
});

export type SaveDraftResult = { ok: true; id: string | null } | { ok: false; error: string };

export async function saveMessageDraft(input: z.infer<typeof draftSchema>): Promise<SaveDraftResult> {
  const session = await getCommsActor();
  if (!session) return { ok: false, error: await tRequest("comms.error") };
  const parsed = draftSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: await tRequest("comms.error") };
  const value = parsed.data;
  const subject = value.subject.trim();
  const empty =
    subject.length === 0 &&
    value.toSelected.length === 0 &&
    value.ccSelected.length === 0 &&
    !JSON.stringify(value.body).includes('"text"');
  if (empty) {
    if (value.id) {
      await session.actor.from("message_drafts").delete().eq("id", value.id);
    }
    revalidatePath(COMMS_MESSAGES);
    return { ok: true, id: null };
  }
  const row = { subject, payload: value as never };
  if (value.id) {
    const { error } = await session.actor.from("message_drafts").update(row).eq("id", value.id);
    if (error) return { ok: false, error: await tRequest("comms.error") };
    revalidatePath(COMMS_MESSAGES);
    return { ok: true, id: value.id };
  }
  const { data, error } = await session.actor
    .from("message_drafts")
    .insert(row)
    .select("id")
    .single();
  if (error || !data) return { ok: false, error: await tRequest("comms.error") };
  revalidatePath(COMMS_MESSAGES);
  return { ok: true, id: data.id };
}

export async function deleteMessageDraft(id: string): Promise<CommsActionResult> {
  const session = await getCommsActor();
  if (!session) return { ok: false, error: await tRequest("comms.error") };
  if (!z.string().uuid().safeParse(id).success) {
    return { ok: false, error: await tRequest("comms.error") };
  }
  const { error } = await session.actor.from("message_drafts").delete().eq("id", id);
  if (error) return { ok: false, error: await tRequest("comms.error") };
  revalidatePath(COMMS_MESSAGES);
  return { ok: true };
}
