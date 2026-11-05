"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createSessionClient } from "@/lib/supabase/session";
import { getTeacherSession } from "@/lib/auth/teacher-session";

/**
 * Emoji reactions for a teacher's own chat messages (docs/chat-reactions.md).
 *
 * Same contract as the ERP's action, on the guardian channel's table. One reaction
 * per person per message is enforced by the database, so this upserts rather than
 * checking first: switching emoji replaces, and tapping your own emoji again removes.
 *
 * The RLS policy pins reactor_profile_id = auth.uid() and requires participation in
 * the conversation, so the ids passed in cannot be used to react for someone else.
 */
export type ChatReactionResult = { ok: true } | { ok: false; error: string };

const RAPID = z.object({
  conversationId: z.string().uuid(),
  messageId: z.string().uuid(),
  emoji: z.string().min(1).max(16),
});

export async function toggleTeacherChatReaction(
  conversationId: string,
  messageId: string,
  emoji: string,
  /** True when this emoji is already the caller's — tapping again removes it. */
  remove: boolean,
): Promise<ChatReactionResult> {
  const parsed = RAPID.safeParse({ conversationId, messageId, emoji });
  if (!parsed.success) return { ok: false, error: "invalid_input" };

  const session = await getTeacherSession();
  if (!session) return { ok: false, error: "not_authorized" };

  const supabase = await createSessionClient();

  if (remove) {
    const { error } = await supabase
      .from("chat_message_reactions")
      .delete()
      .eq("message_id", parsed.data.messageId)
      .eq("reactor_profile_id", session.userId);
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await supabase.from("chat_message_reactions").upsert(
      {
        tenant_id: session.tenantId,
        message_id: parsed.data.messageId,
        reactor_profile_id: session.userId,
        emoji: parsed.data.emoji,
      },
      { onConflict: "message_id,reactor_profile_id" },
    );
    if (error) return { ok: false, error: error.message };
  }

  revalidatePath(`/comunicacion/chat/${conversationId}`);
  return { ok: true };
}
