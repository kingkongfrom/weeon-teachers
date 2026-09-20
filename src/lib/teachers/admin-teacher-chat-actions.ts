"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { COMMS_CHAT } from "@/lib/comms/paths";
import { getTeacherSession } from "@/lib/auth/teacher-session";
import { getT } from "@/lib/i18n/server";
import { createSessionClient } from "@/lib/supabase/session";

export type AdminTeacherChatActionResult =
  | { ok: true; conversationId?: string; messageId?: string }
  | { ok: false; error: string };

/** Opens or reuses the teacher ↔ school-admin chat thread. */
export async function startTeacherAdminChat(): Promise<AdminTeacherChatActionResult> {
  const t = await getT();
  const session = await getTeacherSession();
  if (!session) return { ok: false, error: t.messages.chatLoadError };

  const supabase = await createSessionClient();
  const { data, error } = await supabase.rpc("start_teacher_admin_chat");
  if (error || !data) {
    const message = error?.message?.trim() ?? "";
    if (message.includes("no_admin")) {
      return { ok: false, error: t.messages.chatAdminNoAdmin };
    }
    return { ok: false, error: message || t.messages.chatLoadError };
  }

  revalidatePath(COMMS_CHAT);
  return { ok: true, conversationId: data as string };
}

export async function sendAdminTeacherChatMessage(
  conversationId: string,
  body: string,
): Promise<AdminTeacherChatActionResult> {
  const t = await getT();
  const session = await getTeacherSession();
  if (!session) return { ok: false, error: t.messages.chatLoadError };

  const parsed = z
    .object({ conversationId: z.string().uuid(), body: z.string().trim().min(1).max(4000) })
    .safeParse({ conversationId, body });
  if (!parsed.success) return { ok: false, error: t.messages.chatLoadError };

  const supabase = await createSessionClient();
  const { data, error } = await supabase.rpc("send_admin_teacher_chat_message", {
    p_conversation_id: parsed.data.conversationId,
    p_body: parsed.data.body,
  });
  if (error || !data) return { ok: false, error: t.messages.chatLoadError };

  revalidatePath(COMMS_CHAT);
  revalidatePath(`${COMMS_CHAT}/${parsed.data.conversationId}`);
  return {
    ok: true,
    conversationId: parsed.data.conversationId,
    messageId: data as string,
  };
}

export async function deleteAdminTeacherChat(
  conversationId: string,
): Promise<AdminTeacherChatActionResult> {
  const t = await getT();
  const session = await getTeacherSession();
  if (!session) return { ok: false, error: t.messages.chatLoadError };

  const parsed = z.string().uuid().safeParse(conversationId);
  if (!parsed.success) return { ok: false, error: t.messages.chatLoadError };

  const supabase = await createSessionClient();
  const { error } = await supabase.rpc("delete_admin_teacher_chat", {
    p_conversation_id: parsed.data,
  });
  if (error) {
    return {
      ok: false,
      error: error.message?.trim() || t.messages.chatDeleteError,
    };
  }

  revalidatePath(COMMS_CHAT);
  return { ok: true };
}

export async function markAdminTeacherChatRead(
  conversationId: string,
): Promise<AdminTeacherChatActionResult> {
  const session = await getTeacherSession();
  if (!session) return { ok: false, error: "not_authenticated" };

  const parsed = z.string().uuid().safeParse(conversationId);
  if (!parsed.success) return { ok: false, error: "invalid_conversation" };

  const supabase = await createSessionClient();
  await supabase.rpc("mark_admin_teacher_chat_read", {
    p_conversation_id: parsed.data,
  });
  return { ok: true };
}
