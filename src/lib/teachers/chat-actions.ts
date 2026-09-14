"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSessionClient } from "@/lib/supabase/session";
import { getTeacherSession } from "@/lib/auth/teacher-session";
import { getT } from "@/lib/i18n/server";

export type ChatActionResult =
  | { ok: true; conversationId: string; messageId?: string }
  | { ok: false; error: string };

const startSchema = z.object({
  recipientKey: z.string().trim().min(1).max(200),
  recipientName: z.string().trim().max(200),
});

/** Opens (or reuses) the teacher ↔ guardian conversation. */
export async function startChatConversation(
  recipientKey: string,
  recipientName: string,
): Promise<ChatActionResult> {
  const t = await getT();
  const session = await getTeacherSession();
  if (!session) return { ok: false, error: t.messages.chatLoadError };

  const parsed = startSchema.safeParse({ recipientKey, recipientName });
  if (!parsed.success) return { ok: false, error: t.messages.chatLoadError };

  const supabase = await createSessionClient();
  const { data, error } = await supabase.rpc("start_chat_conversation", {
    p_recipient_key: parsed.data.recipientKey,
    p_recipient_name: parsed.data.recipientName,
  });
  if (error || !data) return { ok: false, error: t.messages.chatLoadError };

  revalidatePath("/comunicacion/chat");
  return { ok: true, conversationId: data as string };
}

/** Posts a plain-text chat message to a conversation the teacher is part of. */
export async function sendChatMessage(
  conversationId: string,
  body: string,
): Promise<ChatActionResult> {
  const t = await getT();
  const session = await getTeacherSession();
  if (!session) return { ok: false, error: t.messages.chatLoadError };

  const parsed = z
    .object({ conversationId: z.string().uuid(), body: z.string().trim().min(1).max(4000) })
    .safeParse({ conversationId, body });
  if (!parsed.success) return { ok: false, error: t.messages.chatLoadError };

  const supabase = await createSessionClient();
  const { data, error } = await supabase.rpc("send_chat_message", {
    p_conversation_id: parsed.data.conversationId,
    p_body: parsed.data.body,
  });
  if (error || !data) return { ok: false, error: t.messages.chatLoadError };

  revalidatePath(`/comunicacion/chat/${conversationId}`);
  revalidatePath("/comunicacion/chat");
  return { ok: true, conversationId, messageId: data as string };
}

/** Marks the teacher's side of the conversation read. */
export async function markChatRead(conversationId: string): Promise<void> {
  const session = await getTeacherSession();
  if (!session) return;
  const parsed = z.string().uuid().safeParse(conversationId);
  if (!parsed.success) return;

  const supabase = await createSessionClient();
  await supabase.rpc("mark_chat_read", { p_conversation_id: parsed.data });
}
