import "server-only";

import { cache } from "react";
import { getTeacherSession } from "@/lib/auth/teacher-session";
import { createSessionClient } from "@/lib/supabase/session";
import { docToPlainText, type RichTextDoc } from "@/lib/assessments/model";

export type MessageFolder = "inbox" | "sent";

export type MessageThreadSummary = {
  id: string;
  subject: string;
  audience: "individual" | "group";
  className: string | null;
  counterpart: string;
  preview: string;
  lastMessageAt: string;
  unread: boolean;
  recipientCount: number;
  attachmentCount: number;
  mine: boolean;
};

export type MessageItem = {
  id: string;
  authorName: string;
  body: RichTextDoc;
  createdAt: string;
  mine: boolean;
};

export type MessageRecipient = {
  profileId: string;
  name: string;
  role: "to" | "cc";
  readAt: string | null;
};

export type MessageAttachment = {
  id: string;
  name: string;
  url: string;
  mimeType: string | null;
  sizeBytes: number | null;
};

export type MessageThreadDetail = {
  summary: MessageThreadSummary;
  allowReplies: boolean;
  classId: string | null;
  messages: MessageItem[];
  recipients: MessageRecipient[];
  attachments: MessageAttachment[];
};

export type MessageContact = {
  key: string;
  name: string;
  kind: string;
  context: string;
};

type NameEmbed = { name: string } | { name: string }[] | null;

function nameOf(embed: NameEmbed): string {
  const row = Array.isArray(embed) ? embed[0] : embed;
  return row?.name?.trim() ?? "";
}

function classLabel(embed: { name?: string; grade?: string; section?: string } | { name?: string; grade?: string; section?: string }[] | null): string | null {
  const row = Array.isArray(embed) ? embed[0] : embed;
  if (!row) return null;
  return row.name?.trim() || [row.grade, row.section].filter(Boolean).join("").toUpperCase() || null;
}

/** Parents a teacher may message (RPC), for the composer's recipient picker. */
export const loadMessageContacts = cache(async (): Promise<MessageContact[]> => {
  const session = await getTeacherSession();
  if (!session) return [];
  const supabase = await createSessionClient();
  const { data, error } = await supabase.rpc("list_message_contacts");
  if (error || !data) return [];
  return (
    data as Array<{ recipient_key: string; full_name: string; kind: string; context: string }>
  ).map((row) => ({
    key: row.recipient_key,
    name: row.full_name || "Contacto",
    kind: row.kind,
    context: row.context ?? "",
  }));
});

/** Thread summaries for a folder (inbox = received, sent = authored). */
export const loadMessageSummaries = cache(
  async (folder: MessageFolder): Promise<MessageThreadSummary[]> => {
    const session = await getTeacherSession();
    if (!session) return [];
    const supabase = await createSessionClient();

    const { data: threads, error } = await supabase
      .from("threads")
      .select(
        "id, subject, audience, class_id, created_by, allow_replies, last_message_at, created_at, profiles(name), classes(name, grade, section)",
      )
      .order("last_message_at", { ascending: false })
      .limit(60);

    if (error || !threads) return [];

    type ThreadRow = {
      id: string;
      subject: string | null;
      audience: string;
      class_id: string | null;
      created_by: string | null;
      allow_replies: boolean;
      last_message_at: string;
      created_at: string;
      profiles: NameEmbed;
      classes: { name?: string; grade?: string; section?: string } | Array<{ name?: string; grade?: string; section?: string }> | null;
    };

    const rows = threads as ThreadRow[];
    const ids = rows.map((row) => row.id);
    if (ids.length === 0) return [];

    const [{ data: recipients }, { data: messages }, { data: attachments }] = await Promise.all([
      supabase
        .from("thread_recipients")
        .select("thread_id, profile_id, recipient_key, role, read_at, display_name, profiles(name)")
        .in("thread_id", ids),
      supabase
        .from("messages")
        .select("thread_id, body, created_at, author_profile_id, profiles(name)")
        .in("thread_id", ids)
        .order("created_at", { ascending: true }),
      supabase.from("message_attachments").select("thread_id").in("thread_id", ids),
    ]);

    const recipientRows = (recipients ?? []) as Array<{
      thread_id: string;
      profile_id: string | null;
      recipient_key: string | null;
      role: "to" | "cc";
      read_at: string | null;
      display_name: string | null;
      profiles: NameEmbed;
    }>;
    const messageRows = (messages ?? []) as Array<{
      thread_id: string;
      body: RichTextDoc;
      created_at: string;
      author_profile_id: string | null;
      profiles: NameEmbed;
    }>;

    const attachmentCount = new Map<string, number>();
    for (const row of (attachments ?? []) as Array<{ thread_id: string }>) {
      attachmentCount.set(row.thread_id, (attachmentCount.get(row.thread_id) ?? 0) + 1);
    }

    return rows
      .map((row) => {
        const threadRecipients = recipientRows.filter((item) => item.thread_id === row.id);
        const threadMessages = messageRows.filter((item) => item.thread_id === row.id);
        const last = threadMessages[threadMessages.length - 1];
        const mine = row.created_by === session.userId;

        if (folder === "inbox" && !threadRecipients.some((item) => item.profile_id === session.userId)) {
          return null;
        }
        if (folder === "sent" && !mine) return null;

        const myRecipient = threadRecipients.find(
          (item) => item.profile_id === session.userId || item.recipient_key === session.userId,
        );
        return {
          id: row.id,
          subject: row.subject?.trim() || "(Sin asunto)",
          audience: row.audience === "group" ? "group" : "individual",
          className: classLabel(row.classes),
          counterpart: mine
            ? threadRecipients
                .map((item) => nameOf(item.profiles) || item.display_name || "")
                .filter(Boolean)
                .join(", ") || "Sin destinatarios"
            : nameOf(row.profiles) || "Docente",
          preview: last ? docToPlainText(last.body).slice(0, 140) : "",
          lastMessageAt: row.last_message_at,
          unread: folder === "inbox" && Boolean(myRecipient && !myRecipient.read_at),
          recipientCount: threadRecipients.length,
          attachmentCount: attachmentCount.get(row.id) ?? 0,
          mine,
        } satisfies MessageThreadSummary;
      })
      .filter((row): row is MessageThreadSummary => row !== null);
  },
);

/** One thread with its messages and recipients. */
export const loadThreadDetail = cache(
  async (threadId: string): Promise<MessageThreadDetail | null> => {
    const session = await getTeacherSession();
    if (!session) return null;
    const supabase = await createSessionClient();

    const { data: thread, error } = await supabase
      .from("threads")
      .select(
        "id, subject, audience, class_id, created_by, allow_replies, last_message_at, created_at, profiles(name), classes(name, grade, section)",
      )
      .eq("id", threadId)
      .maybeSingle();
    if (error || !thread) return null;

    const row = thread as {
      id: string;
      subject: string | null;
      audience: string;
      class_id: string | null;
      created_by: string | null;
      allow_replies: boolean;
      last_message_at: string;
      profiles: NameEmbed;
      classes: { name?: string; grade?: string; section?: string } | Array<{ name?: string; grade?: string; section?: string }> | null;
    };

    const [{ data: messages }, { data: recipients }, { data: attachmentRows }] = await Promise.all([
      supabase
        .from("messages")
        .select("id, body, created_at, author_profile_id, profiles(name)")
        .eq("thread_id", threadId)
        .order("created_at", { ascending: true }),
      supabase
        .from("thread_recipients")
        .select("profile_id, recipient_key, role, read_at, display_name, profiles(name)")
        .eq("thread_id", threadId),
      supabase
        .from("message_attachments")
        .select("id, file_name, storage_path, mime_type, size_bytes")
        .eq("thread_id", threadId)
        .order("created_at", { ascending: true }),
    ]);

    const attachments = (attachmentRows ?? []) as Array<{
      id: string;
      file_name: string;
      storage_path: string;
      mime_type: string | null;
      size_bytes: number | null;
    }>;
    let signedUrls = new Map<string, string>();
    if (attachments.length > 0) {
      const { data: signed } = await supabase.storage
        .from("message-attachments")
        .createSignedUrls(attachments.map((row) => row.storage_path), 60 * 60);
      signedUrls = new Map(
        (signed ?? [])
          .filter((row) => row.path && row.signedUrl)
          .map((row) => [row.path as string, row.signedUrl as string]),
      );
    }

    const messageRows = (messages ?? []) as Array<{
      id: string;
      body: RichTextDoc;
      created_at: string;
      author_profile_id: string | null;
      profiles: NameEmbed;
    }>;
    const recipientRows = (recipients ?? []) as Array<{
      profile_id: string | null;
      recipient_key: string | null;
      role: "to" | "cc";
      read_at: string | null;
      display_name: string | null;
      profiles: NameEmbed;
    }>;

    const mine = row.created_by === session.userId;
    const last = messageRows[messageRows.length - 1];

    return {
      allowReplies: row.allow_replies,
      classId: row.class_id,
      summary: {
        id: row.id,
        subject: row.subject?.trim() || "(Sin asunto)",
        audience: row.audience === "group" ? "group" : "individual",
        className: classLabel(row.classes),
        counterpart: mine
          ? recipientRows
              .map((item) => nameOf(item.profiles) || item.display_name || "")
              .filter(Boolean)
              .join(", ") || "Sin destinatarios"
          : nameOf(row.profiles) || "Docente",
        preview: last ? docToPlainText(last.body).slice(0, 140) : "",
        lastMessageAt: row.last_message_at,
        unread: false,
        recipientCount: recipientRows.length,
        attachmentCount: attachments.length,
        mine,
      },
      messages: messageRows.map((message) => ({
        id: message.id,
        authorName: nameOf(message.profiles),
        body: message.body,
        createdAt: message.created_at,
        mine: message.author_profile_id === session.userId,
      })),
      recipients: recipientRows.map((recipient) => ({
        profileId: recipient.profile_id ?? recipient.recipient_key ?? "",
        name: nameOf(recipient.profiles) || recipient.display_name || "",
        role: recipient.role,
        readAt: recipient.read_at,
      })),
      attachments: attachments.map((attachment) => ({
        id: attachment.id,
        name: attachment.file_name,
        url: signedUrls.get(attachment.storage_path) ?? "",
        mimeType: attachment.mime_type,
        sizeBytes: attachment.size_bytes,
      })),
    };
  },
);
