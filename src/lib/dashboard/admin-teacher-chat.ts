import "server-only";

import { cache } from "react";
import { getTeacherSession } from "@/lib/auth/teacher-session";
import { createSessionClient } from "@/lib/supabase/session";

export type AdminTeacherChatSummary = {
  id: string;
  counterpartName: string;
  preview: string;
  lastMessageAt: string;
  unread: boolean;
};

export type AdminTeacherChatMessage = {
  id: string;
  body: string;
  createdAt: string;
  mine: boolean;
};

export type AdminTeacherChatDetail = {
  id: string;
  counterpartName: string;
  messages: AdminTeacherChatMessage[];
};

type ConversationListRow = {
  id: string;
  counterpart_name: string | null;
  last_body: string | null;
  last_at: string | null;
  unread: boolean | null;
};

/** Admin ↔ teacher conversations where the signed-in user is the teacher. */
export const loadAdminTeacherChatConversations = cache(
  async (): Promise<AdminTeacherChatSummary[]> => {
    const session = await getTeacherSession();
    if (!session) return [];
    const supabase = await createSessionClient();

    const { data, error } = await supabase.rpc("list_admin_teacher_chat_conversations");
    if (error || !data) return [];

    return (data as ConversationListRow[]).map((row) => ({
      id: row.id,
      counterpartName: row.counterpart_name?.trim() || "Administración",
      preview: row.last_body?.trim() || "",
      lastMessageAt: row.last_at ?? new Date(0).toISOString(),
      unread: Boolean(row.unread),
    }));
  },
);

export const loadAdminTeacherChatUnreadCount = cache(async (): Promise<number> => {
  const conversations = await loadAdminTeacherChatConversations();
  return conversations.filter((row) => row.unread).length;
});

export const loadAdminTeacherChatDetail = cache(
  async (conversationId: string): Promise<AdminTeacherChatDetail | null> => {
    const session = await getTeacherSession();
    if (!session) return null;
    const supabase = await createSessionClient();

    const { data: conversation, error } = await supabase
      .from("admin_teacher_chat_conversations")
      .select("id, admin_profile_id, teacher_profile_id")
      .eq("id", conversationId)
      .maybeSingle();
    if (error || !conversation) return null;

    const row = conversation as {
      id: string;
      admin_profile_id: string;
      teacher_profile_id: string;
    };
    if (row.teacher_profile_id !== session.userId) return null;

    const [{ data: messages }, { data: adminProfile }] = await Promise.all([
      supabase
        .from("admin_teacher_chat_messages")
        .select("id, body, created_at, author_profile_id")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true }),
      supabase.from("profiles").select("name").eq("id", row.admin_profile_id).maybeSingle(),
    ]);

    const adminName =
      (adminProfile as { name?: string } | null)?.name?.trim() || "Administración";

    return {
      id: row.id,
      counterpartName: adminName,
      messages: ((messages ?? []) as Array<{
        id: string;
        body: string;
        created_at: string;
        author_profile_id: string;
      }>).map((message) => ({
        id: message.id,
        body: message.body,
        createdAt: message.created_at,
        mine: message.author_profile_id === session.userId,
      })),
    };
  },
);
