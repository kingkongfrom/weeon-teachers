"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createSessionClient } from "@/lib/supabase/session";
import { getTeacherSession } from "@/lib/auth/teacher-session";

/**
 * Emoji reactions for a teacher's own chat messages (docs/chat-reactions.md).
 *
 * THROUGH THE RPC, NOT A DIRECT WRITE.
 *
 * A direct insert needed the client to satisfy a nested `exists` against the message
 * table, and Postgres answers a failed WITH CHECK with the same generic "violates
 * row-level security policy" whatever the cause. `toggle_chat_reaction` checks
 * participation in the open and raises a message that names the problem -- the same
 * path the ERP uses.
 *
 * One reaction per person per message is enforced by the database: switching emoji
 * is an upsert inside the function, and tapping your own emoji again removes it.
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
  const { error } = await supabase.rpc("toggle_chat_reaction", {
    p_message_id: parsed.data.messageId,
    p_emoji: parsed.data.emoji,
    p_remove: remove,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/comunicacion/chat/${conversationId}`);
  return { ok: true };
}
