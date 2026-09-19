import { cache } from "react";
import { emptyDoc, type RichTextDoc } from "@/lib/comms/model";
import { getCommsActor, type CommsActor } from "@/lib/dashboard/comms-session";

export type MessageMailboxSettings = {
  signatureBody: RichTextDoc;
  autoReplyEnabled: boolean;
  autoReplyStart: string | null;
  autoReplyEnd: string | null;
  autoReplyBody: RichTextDoc;
};

export const emptyMailboxSettings = (): MessageMailboxSettings => ({
  signatureBody: emptyDoc(),
  autoReplyEnabled: false,
  autoReplyStart: null,
  autoReplyEnd: null,
  autoReplyBody: emptyDoc(),
});

function parseDoc(value: unknown): RichTextDoc {
  if (value && typeof value === "object" && (value as RichTextDoc).type === "doc") {
    return value as RichTextDoc;
  }
  return emptyDoc();
}

export const loadMessageMailboxSettings = cache(async (): Promise<MessageMailboxSettings> => {
  const session = await getCommsActor();
  if (!session) return emptyMailboxSettings();

  const { data, error } = await session.actor
    .from("message_mailbox_settings")
    .select(
      "signature_body, auto_reply_enabled, auto_reply_start, auto_reply_end, auto_reply_body",
    )
    .eq("owner_profile_id", session.userId)
    .maybeSingle();

  if (error || !data) return emptyMailboxSettings();

  const row = data as {
    signature_body: unknown;
    auto_reply_enabled: boolean;
    auto_reply_start: string | null;
    auto_reply_end: string | null;
    auto_reply_body: unknown;
  };

  return {
    signatureBody: parseDoc(row.signature_body),
    autoReplyEnabled: row.auto_reply_enabled,
    autoReplyStart: row.auto_reply_start,
    autoReplyEnd: row.auto_reply_end,
    autoReplyBody: parseDoc(row.auto_reply_body),
  };
});

export async function loadMessageMailboxSettingsForSession(
  session: CommsActor,
): Promise<MessageMailboxSettings> {
  const { data } = await session.actor
    .from("message_mailbox_settings")
    .select(
      "signature_body, auto_reply_enabled, auto_reply_start, auto_reply_end, auto_reply_body",
    )
    .eq("owner_profile_id", session.userId)
    .maybeSingle();

  if (!data) return emptyMailboxSettings();

  const row = data as {
    signature_body: unknown;
    auto_reply_enabled: boolean;
    auto_reply_start: string | null;
    auto_reply_end: string | null;
    auto_reply_body: unknown;
  };

  return {
    signatureBody: parseDoc(row.signature_body),
    autoReplyEnabled: row.auto_reply_enabled,
    autoReplyStart: row.auto_reply_start,
    autoReplyEnd: row.auto_reply_end,
    autoReplyBody: parseDoc(row.auto_reply_body),
  };
}
