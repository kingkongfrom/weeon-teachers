import "server-only";

import { cache } from "react";
import { getTeacherSession } from "@/lib/auth/teacher-session";
import { createSessionClient } from "@/lib/supabase/session";
import { avatarUrlsBySubjectKey } from "@/lib/comms/profile-avatar-urls";
import {
  loadGuardianChatDirectory,
  lookupGuardianStudentContext,
} from "@/lib/dashboard/chat-guardian-context";
import { loadAdminTeacherChatConversations, loadAdminTeacherChatDetail } from "@/lib/dashboard/admin-teacher-chat";
import { cleanGuardianDisplayName } from "@/lib/messages/chat-display";
import type {
  ChatConversationDetail,
  ChatConversationSummary,
  ChatContact,
  ChatMessageItem,
} from "@/lib/messages/chat-model";

export type {
  ChatConversationDetail,
  ChatConversationSummary,
  ChatMessageItem,
} from "@/lib/messages/chat-model";

type ConversationListRow = {
  id: string;
  counterpart_name: string | null;
  last_body: string | null;
  last_at: string | null;
  unread: boolean | null;
  context_label?: string | null;
  student_name?: string | null;
};

/** Realtime channel config for the browser client (anon key is public). */
export type ChatRealtimeConfig = { url: string; anonKey: string };

/** Administración, encargados, and students the teacher can start a chat with. */
export const loadChatGuardianContacts = cache(async (): Promise<ChatContact[]> => {
  const session = await getTeacherSession();
  if (!session) return [];
  const supabase = await createSessionClient();
  const { data, error } = await supabase.rpc("list_message_contacts");
  if (error || !data) return [];

  const seen = new Set<string>();
  const contacts: ChatContact[] = [];
  for (const row of data as Array<{
    recipient_key: string;
    full_name: string;
    kind: string;
    context: string | null;
    student_name?: string | null;
  }>) {
    if (row.kind !== "parent" && row.kind !== "student") continue;
    const key = row.recipient_key?.trim();
    const name = row.full_name?.trim();
    if (!key || !name) continue;
    const context = row.context?.trim() ?? "";
    const studentName =
      row.kind === "student" ? "" : (row.student_name?.trim() ?? "");
    // The RPC emits one row per (account, class): a guardian covering two
    // classes legitimately appears twice, each labelled with its class and
    // child. Collapse only exact repeats of the same account in the same class.
    const dedupe = `${row.kind}::${key}::${context}::${studentName}`;
    if (seen.has(dedupe)) continue;
    seen.add(dedupe);
    contacts.push({
      key,
      name,
      context,
      studentName,
      kind: row.kind,
    });
  }

  contacts.sort((a, b) => {
    const byClass = a.context.localeCompare(b.context, "es");
    if (byClass !== 0) return byClass;
    return a.name.localeCompare(b.name, "es");
  });

  const photos = await avatarUrlsBySubjectKey(
    supabase,
    contacts.map((contact) => contact.key),
  );
  return contacts.map((contact) => ({
    ...contact,
    avatarUrl: photos.get(contact.key) ?? null,
  }));
});

/** Guardian + school-admin conversations for the signed-in teacher. */
export const loadChatConversations = cache(async (): Promise<ChatConversationSummary[]> => {
  const session = await getTeacherSession();
  if (!session) return [];
  const supabase = await createSessionClient();

  const [listRes, adminConversations, { map, contacts }, keysRes] = await Promise.all([
    supabase.rpc("list_chat_conversations"),
    loadAdminTeacherChatConversations(),
    loadGuardianChatDirectory(session),
    supabase
      .from("chat_conversations")
      .select("id, recipient_key")
      .eq("teacher_profile_id", session.userId),
  ]);

  /*
   * Authoritative role per conversation, fetched once.
   *
   * `kind` decides the badge the teacher sees (ENCARGADO vs ESTUDIANTE), so it must
   * come from roster data, not from comparing names. chat_counterpart_kinds reads
   * roster_accounts.source_kind, which is the account's actual role.
   *
   * A missing entry means "not a roster account we can resolve"; the row then shows
   * no role rather than an invented one.
   */
  const conversationIds = (listRes.data ?? [])
    .map((row: { id: unknown }) => row.id as string)
    .filter(Boolean);
  const kindByConversation = new Map<string, "parent" | "student">();
  if (conversationIds.length > 0) {
    const { data: kinds } = await supabase.rpc("chat_counterpart_kinds", {
      p_conversation_ids: conversationIds,
    });
    for (const row of (kinds ?? []) as Array<{
      conversation_id: string;
      counterpart_kind: string | null;
    }>) {
      if (row.counterpart_kind === "parent" || row.counterpart_kind === "student") {
        kindByConversation.set(row.conversation_id, row.counterpart_kind);
      }
    }
  }
  const guardianRows: ChatConversationSummary[] = [];
  if (listRes.data && !listRes.error) {
    const recipientKeyById = new Map<string, string>();
    for (const row of keysRes.data ?? []) {
      recipientKeyById.set(row.id as string, row.recipient_key as string);
    }

    const contactByKeyClass = new Map(
      contacts.map((contact) => [`${contact.key}::${contact.context}`, contact]),
    );
    const avatarUrls = await avatarUrlsBySubjectKey(supabase, [...recipientKeyById.values()]);

    for (const row of listRes.data as ConversationListRow[]) {
      const recipientKey = recipientKeyById.get(row.id) ?? "";
      const fromMap = lookupGuardianStudentContext(map, recipientKey, null, null);
      const contact =
        [...contactByKeyClass.values()].find((item) => item.key === recipientKey) ?? null;

      const classLabel =
        row.context_label?.trim() || contact?.context || fromMap?.classLabel || "";
      const studentName =
        row.student_name?.trim() ||
        contact?.studentName ||
        fromMap?.studentName ||
        row.counterpart_name?.trim() ||
        "";

      if (studentName.trim().length === 0) continue;

      /*
       * kind decides the badge the teacher sees -- ENCARGADO vs ESTUDIANTE.
       *
       * The RPC returns an AUTHORITATIVE kind, derived from roster_accounts
       * .source_kind = 'student' | 'guardian'. contact carries it. When it is
       * absent -- a conversation whose counterpart is no longer in the contact
       * list -- we must NOT guess from names: the old fallback compared the
       * student's name with the counterpart's name and called it a student when
       * they matched. A parent who happens to share the child's name (or an
       * unnamed guardian whose display name was cleaned to the child's) was then
       * shown as ESTUDIANTE, and everyone else as ENCARGADO -- wrong badges for
       * real people.
       *
       * With no evidence the only honest label is the guardian channel's default,
       * and the row is left to show its context label instead of asserting a role.
       */
      const kind: "parent" | "student" =
        kindByConversation.get(row.id) ??
        (contact?.kind === "student" ? "student" : "parent");

      guardianRows.push({
        id: row.id,
        channel: "guardian",
        kind,
        counterpartName: cleanGuardianDisplayName(row.counterpart_name),
        classLabel,
        studentName,
        lastBody: row.last_body ?? "",
        lastAt: row.last_at ?? new Date(0).toISOString(),
        unread: Boolean(row.unread),
        avatarUrl: recipientKey ? (avatarUrls.get(recipientKey) ?? null) : null,
      });
    }
  }

  const adminRows: ChatConversationSummary[] = adminConversations.map((row) => ({
    id: row.id,
    channel: "admin" as const,
    kind: "admin" as const,
    counterpartName: row.counterpartName,
    classLabel: "",
    studentName: "",
    lastBody: row.preview,
    lastAt: row.lastMessageAt,
    unread: row.unread,
    avatarUrl: row.avatarUrl,
  }));

  return [...guardianRows, ...adminRows].sort(
    (a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime(),
  );
});

/** One chat: guardian or school-admin thread. Marks nothing read (the client does). */
export const loadChatConversation = cache(
  async (conversationId: string): Promise<ChatConversationDetail | null> => {
    const session = await getTeacherSession();
    if (!session) return null;

    const adminDetail = await loadAdminTeacherChatDetail(conversationId);
    if (adminDetail) {
      return {
        id: adminDetail.id,
        channel: "admin",
        counterpartName: adminDetail.counterpartName,
        classLabel: "",
        studentName: "",
        otherReadAt: adminDetail.otherReadAt,
        avatarUrl: adminDetail.avatarUrl,
        messages: adminDetail.messages.map((message) => ({
          id: message.id,
          body: message.body,
          createdAt: message.createdAt,
          mine: message.mine,
          authorName: message.mine ? session.name : adminDetail.counterpartName,
        })),
      };
    }

    const supabase = await createSessionClient();

    const { data: conversation, error } = await supabase
      .from("chat_conversations")
      .select("id, teacher_profile_id, recipient_key, recipient_name, recipient_last_read_at")
      .eq("id", conversationId)
      .maybeSingle();
    if (error || !conversation) return null;

    const row = conversation as {
      id: string;
      teacher_profile_id: string;
      recipient_key: string;
      recipient_name: string | null;
      recipient_last_read_at: string | null;
    };

    const otherReadAt = row.recipient_last_read_at;

    const mine = row.teacher_profile_id === session.userId;
    let counterpartName = cleanGuardianDisplayName(row.recipient_name);
    if (!mine) {
      const { data: teacher } = await supabase
        .from("profiles")
        .select("name")
        .eq("id", row.teacher_profile_id)
        .maybeSingle();
      counterpartName = (teacher as { name?: string } | null)?.name?.trim() || "Docente";
    }

    const { map, contacts } = await loadGuardianChatDirectory(session);
    const contact = contacts.find((item) => item.key === row.recipient_key) ?? null;
    const fromMap = lookupGuardianStudentContext(map, row.recipient_key, contact?.context, contact?.classId);

    const classLabel = contact?.context || fromMap?.classLabel || "";
    const studentName = contact?.studentName || fromMap?.studentName || "";

    const counterpartKey = mine ? row.recipient_key : row.teacher_profile_id;
    const [photos, { data: messages }] = await Promise.all([
      avatarUrlsBySubjectKey(supabase, [counterpartKey]),
      supabase
        .from("chat_messages")
        .select("id, body, author_profile_id, created_at, reply_to_id, reply_to_sender_name, reply_to_preview, reply_to_created_at")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true }),
    ]);

    return {
      id: conversationId,
      channel: "guardian",
      counterpartName,
      classLabel,
      studentName,
      otherReadAt: otherReadAt ?? null,
      avatarUrl: photos.get(counterpartKey) ?? null,
      messages: (
        (messages ?? []) as Array<{
          id: string;
          body: string;
          author_profile_id: string | null;
          created_at: string;
          reply_to_id: string | null;
          reply_to_sender_name: string | null;
          reply_to_preview: string | null;
          reply_to_created_at: string | null;
        }>
      ).map((message) => {
        const isMine = message.author_profile_id === session.userId;
        return {
          id: message.id,
          body: message.body,
          createdAt: message.created_at,
          mine: isMine,
          authorName: isMine ? session.name : counterpartName,
          /*
           * The quote is a snapshot stored with the reply (docs/chat-replies.md
           * D1), so no join is needed -- and it still renders if the original is
           * gone. Only built when reply_to_id is set, so every pre-existing
           * message keeps exactly the shape it had.
           */
          ...(message.reply_to_id
            ? {
                replyTo: {
                  id: message.reply_to_id,
                  senderName: message.reply_to_sender_name ?? '',
                  preview: message.reply_to_preview ?? '',
                  createdAt: message.reply_to_created_at ?? '',
                },
              }
            : {}),
        };
      }),
    };
  },
);
