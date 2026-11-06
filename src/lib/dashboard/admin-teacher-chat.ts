import "server-only";

import { cache } from "react";
import { getTeacherSession } from "@/lib/auth/teacher-session";
import { avatarUrlsBySubjectKey } from "@/lib/comms/profile-avatar-urls";
import { createSessionClient } from "@/lib/supabase/session";
import type { ChatMessageReaction } from "@/lib/messages/chat-model";

export type AdminTeacherChatSummary = {
  id: string;
  counterpartName: string;
  preview: string;
  lastMessageAt: string;
  unread: boolean;
  avatarUrl: string | null;
};

export type AdminTeacherChatMessage = {
  id: string;
  body: string;
  createdAt: string;
  mine: boolean;
  /** Aggregated reactions; always an array (docs/chat-reactions.md). */
  reactions: ChatMessageReaction[];
};

export type AdminTeacherChatDetail = {
  id: string;
  counterpartName: string;
  avatarUrl: string | null;
  messages: AdminTeacherChatMessage[];
  otherReadAt: string | null;
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
    const rows = data as ConversationListRow[];
    if (rows.length === 0) return [];
    const ids = rows.map((row) => row.id);
    const { data: links } = await supabase
      .from("admin_teacher_chat_conversations")
      .select("id, admin_profile_id")
      .in("id", ids);
    const adminByConv = new Map(
      ((links ?? []) as Array<{ id: string; admin_profile_id: string }>).map((row) => [
        row.id,
        row.admin_profile_id,
      ]),
    );
    const avatarUrls = await avatarUrlsBySubjectKey(supabase, [...adminByConv.values()]);

    return rows.map((row) => {
      const adminId = adminByConv.get(row.id);
      return {
        id: row.id,
        counterpartName: row.counterpart_name?.trim() || "Administración",
        preview: row.last_body?.trim() || "",
        lastMessageAt: row.last_at ?? new Date(0).toISOString(),
        unread: Boolean(row.unread),
        avatarUrl: adminId ? (avatarUrls.get(adminId) ?? null) : null,
      };
    });
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
      .select("id, admin_profile_id, teacher_profile_id, admin_last_read_at, teacher_last_read_at")
      .eq("id", conversationId)
      .maybeSingle();
    if (error || !conversation) return null;

    const row = conversation as {
      id: string;
      admin_profile_id: string;
      teacher_profile_id: string;
      admin_last_read_at: string | null;
      teacher_last_read_at: string | null;
    };
    if (row.teacher_profile_id !== session.userId) return null;

    const otherReadAt = row.admin_last_read_at;

    const [{ data: messages }, { data: adminProfile }] = await Promise.all([
      supabase
        .from("admin_teacher_chat_messages")
        .select("id, body, created_at, author_profile_id")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true }),
      supabase.from("profiles").select("name").eq("id", row.admin_profile_id).maybeSingle(),
    ]);

    const admin = adminProfile as { name?: string } | null;
    const adminName = admin?.name?.trim() || "Administración";
    const photos = await avatarUrlsBySubjectKey(supabase, [row.admin_profile_id]);
    const avatarUrl = photos.get(row.admin_profile_id) ?? null;

    /*
     * Reactions for the whole thread, once (docs/chat-reactions.md D6).
     *
     * This loader used to hard-code `reactions: []`. The consequence was not a
     * cosmetic gap: a reaction written from this thread went into
     * `admin_teacher_chat_message_reactions` and then never came back on the next
     * read, so the chip appeared optimistically and vanished on reload -- it
     * looked like the feature silently failed.
     *
     * Same three steps as the guardian loader: rows, then reactor names, then
     * aggregate. Kept as a separate query rather than a nested select because the
     * two channels live in different tables and a shared helper would have to
     * branch anyway.
     */
    const messageIds = ((messages ?? []) as Array<{ id: string }>).map((message) => message.id);
    const { data: reactionRows } = messageIds.length
      ? await supabase
          .from("admin_teacher_chat_message_reactions")
          .select("message_id, emoji, reactor_profile_id")
          .in("message_id", messageIds)
      : { data: [] as Array<{ message_id: string; emoji: string; reactor_profile_id: string }> };

    const reactions = (reactionRows ?? []) as Array<{
      message_id: string;
      emoji: string;
      reactor_profile_id: string;
    }>;

    const reactorIds = [...new Set(reactions.map((reaction) => reaction.reactor_profile_id))];
    const nameById = new Map<string, string>();
    if (reactorIds.length > 0) {
      const { data: reactors } = await supabase.from("profiles").select("id, name").in("id", reactorIds);
      for (const person of (reactors ?? []) as Array<{ id: string; name: string | null }>) {
        nameById.set(person.id, person.name?.trim() || "Participante");
      }
    }

    const reactionsByMessage = new Map<string, ChatMessageReaction[]>();
    for (const messageId of messageIds) {
      const forMessage = reactions.filter((reaction) => reaction.message_id === messageId);
      if (forMessage.length === 0) continue;
      const byEmoji = new Map<string, string[]>();
      for (const reaction of forMessage) {
        const names = byEmoji.get(reaction.emoji) ?? [];
        names.push(
          reaction.reactor_profile_id === session.userId
            ? "Tú"
            : (nameById.get(reaction.reactor_profile_id) ?? "Participante"),
        );
        byEmoji.set(reaction.emoji, names);
      }
      reactionsByMessage.set(
        messageId,
        [...byEmoji.entries()].map(([emoji, names]) => ({
          emoji,
          count: names.length,
          names,
          mine: forMessage.some(
            (reaction) =>
              reaction.emoji === emoji && reaction.reactor_profile_id === session.userId,
          ),
        })),
      );
    }

    return {
      id: row.id,
      counterpartName: adminName,
      avatarUrl,
      otherReadAt: otherReadAt ?? null,
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
        reactions: reactionsByMessage.get(message.id) ?? [],
      })),
    };
  },
);
