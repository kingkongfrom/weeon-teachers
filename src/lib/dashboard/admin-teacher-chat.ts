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
  avatarUrl: string | null;
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

const PROFILE_AVATARS_BUCKET = "profile-avatars";
const PROFILE_AVATAR_TTL_SEC = 60 * 60 * 6;

async function avatarUrlsByProfileId(
  client: Awaited<ReturnType<typeof createSessionClient>>,
  profileIds: string[],
): Promise<Map<string, string>> {
  const urls = new Map<string, string>();
  const unique = [...new Set(profileIds.filter((id) => /^[0-9a-f-]{36}$/i.test(id)))];
  if (unique.length === 0) return urls;

  const { data } = await client
    .from("profiles")
    .select("id, avatar_storage_path")
    .in("id", unique);
  const rows = (data ?? []) as Array<{ id: string; avatar_storage_path: string | null }>;
  const paths = rows
    .map((row) => row.avatar_storage_path)
    .filter((path): path is string => Boolean(path));
  if (paths.length === 0) return urls;

  const { data: signed } = await client.storage
    .from(PROFILE_AVATARS_BUCKET)
    .createSignedUrls(paths, PROFILE_AVATAR_TTL_SEC);
  const byPath = new Map<string, string>();
  for (const row of signed ?? []) {
    if (row.path && row.signedUrl) byPath.set(row.path, row.signedUrl);
  }
  for (const row of rows) {
    if (!row.avatar_storage_path) continue;
    const url = byPath.get(row.avatar_storage_path);
    if (url) urls.set(row.id, url);
  }
  return urls;
}

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
    const avatarUrls = await avatarUrlsByProfileId(supabase, [...adminByConv.values()]);

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
      supabase.from("profiles").select("name, avatar_storage_path").eq("id", row.admin_profile_id).maybeSingle(),
    ]);

    const admin = adminProfile as { name?: string; avatar_storage_path?: string | null } | null;
    const adminName = admin?.name?.trim() || "Administración";
    const avatarPath = admin?.avatar_storage_path?.trim() || "";
    let avatarUrl: string | null = null;
    if (avatarPath) {
      const signed = await supabase.storage
        .from(PROFILE_AVATARS_BUCKET)
        .createSignedUrl(avatarPath, PROFILE_AVATAR_TTL_SEC);
      avatarUrl = signed.data?.signedUrl ?? null;
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
      })),
    };
  },
);
