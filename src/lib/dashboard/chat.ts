import "server-only";

import { cache } from "react";
import { getTeacherSession } from "@/lib/auth/teacher-session";
import { createSessionClient } from "@/lib/supabase/session";
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

/** Guardians with a linked student in the teacher's classes (picker source). */
export const loadChatGuardianContacts = cache(async (): Promise<ChatContact[]> => {
  const session = await getTeacherSession();
  if (!session) return [];
  const { contacts } = await loadGuardianChatDirectory(session);
  return contacts;
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

  const guardianRows: ChatConversationSummary[] = [];
  if (listRes.data && !listRes.error) {
    const recipientKeyById = new Map<string, string>();
    for (const row of keysRes.data ?? []) {
      recipientKeyById.set(row.id as string, row.recipient_key as string);
    }

    const contactByKeyClass = new Map(
      contacts.map((contact) => [`${contact.key}::${contact.context}`, contact]),
    );

    for (const row of listRes.data as ConversationListRow[]) {
      const recipientKey = recipientKeyById.get(row.id) ?? "";
      const fromMap = lookupGuardianStudentContext(map, recipientKey, null, null);
      const contact =
        [...contactByKeyClass.values()].find((item) => item.key === recipientKey) ?? null;

      const classLabel =
        row.context_label?.trim() || contact?.context || fromMap?.classLabel || "";
      const studentName =
        row.student_name?.trim() || contact?.studentName || fromMap?.studentName || "";

      if (studentName.trim().length === 0) continue;

      guardianRows.push({
        id: row.id,
        channel: "guardian",
        counterpartName: cleanGuardianDisplayName(row.counterpart_name),
        classLabel,
        studentName,
        lastBody: row.last_body ?? "",
        lastAt: row.last_at ?? new Date(0).toISOString(),
        unread: Boolean(row.unread),
      });
    }
  }

  const adminRows: ChatConversationSummary[] = adminConversations.map((row) => ({
    id: row.id,
    channel: "admin" as const,
    counterpartName: row.counterpartName,
    classLabel: "",
    studentName: "",
    lastBody: row.preview,
    lastAt: row.lastMessageAt,
    unread: row.unread,
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
      .select("id, teacher_profile_id, recipient_key, recipient_name")
      .eq("id", conversationId)
      .maybeSingle();
    if (error || !conversation) return null;

    const row = conversation as {
      id: string;
      teacher_profile_id: string;
      recipient_key: string;
      recipient_name: string | null;
    };

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

    const { data: messages } = await supabase
      .from("chat_messages")
      .select("id, body, author_profile_id, created_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    return {
      id: conversationId,
      channel: "guardian",
      counterpartName,
      classLabel,
      studentName,
      messages: (
        (messages ?? []) as Array<{
          id: string;
          body: string;
          author_profile_id: string | null;
          created_at: string;
        }>
      ).map((message) => {
        const isMine = message.author_profile_id === session.userId;
        return {
          id: message.id,
          body: message.body,
          createdAt: message.created_at,
          mine: isMine,
          authorName: isMine ? session.name : counterpartName,
        };
      }),
    };
  },
);
