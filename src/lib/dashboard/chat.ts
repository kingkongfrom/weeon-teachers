import "server-only";

import { cache } from "react";
import { getTeacherSession } from "@/lib/auth/teacher-session";
import { createSessionClient } from "@/lib/supabase/session";
import type { ChatConversationSummary, ChatContact, ChatMessageItem } from "@/lib/messages/chat-model";

export type { ChatConversationSummary, ChatMessageItem } from "@/lib/messages/chat-model";

export type ChatConversationDetail = {
  id: string;
  counterpartName: string;
  messages: ChatMessageItem[];
};

type ConversationListRow = {
  id: string;
  counterpart_name: string | null;
  last_body: string | null;
  last_at: string | null;
  unread: boolean | null;
};

/** Realtime channel config for the browser client (anon key is public). */
export type ChatRealtimeConfig = { url: string; anonKey: string };

/** Guardians only — the chat picker never offers students. */
export const loadChatGuardianContacts = cache(async (): Promise<ChatContact[]> => {
  const session = await getTeacherSession();
  if (!session) return [];
  const supabase = await createSessionClient();
  const { data, error } = await supabase.rpc("list_message_contacts");
  if (error || !data) return [];
  return (data as Array<{ recipient_key: string; full_name: string; kind: string; context: string }>)
    .filter((row) => row.kind === "parent")
    .map((row) => ({
      key: row.recipient_key,
      name: row.full_name || "Encargado",
      context: row.context ?? "",
    }));
});

/** Conversation list for the signed-in teacher (RPC scopes to their pairs). */
export const loadChatConversations = cache(async (): Promise<ChatConversationSummary[]> => {
  const session = await getTeacherSession();
  if (!session) return [];
  const supabase = await createSessionClient();
  const { data, error } = await supabase.rpc("list_chat_conversations");
  if (error || !data) return [];
  return (data as ConversationListRow[]).map((row) => ({
    id: row.id,
    counterpartName: row.counterpart_name?.trim() || "Encargado",
    lastBody: row.last_body ?? "",
    lastAt: row.last_at ?? new Date(0).toISOString(),
    unread: Boolean(row.unread),
  }));
});

/** One chat: counterpart + ordered messages. Marks nothing read (the client does). */
export const loadChatConversation = cache(
  async (conversationId: string): Promise<ChatConversationDetail | null> => {
    const session = await getTeacherSession();
    if (!session) return null;
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
    let counterpartName = row.recipient_name?.trim() || "Encargado";
    if (!mine) {
      const { data: teacher } = await supabase
        .from("profiles")
        .select("name")
        .eq("id", row.teacher_profile_id)
        .maybeSingle();
      counterpartName = (teacher as { name?: string } | null)?.name?.trim() || "Docente";
    }

    const { data: messages } = await supabase
      .from("chat_messages")
      .select("id, body, author_profile_id, created_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    return {
      id: conversationId,
      counterpartName,
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
