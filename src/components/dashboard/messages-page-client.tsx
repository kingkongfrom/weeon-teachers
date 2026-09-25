"use client";

import { MessagesWorkspace } from "@/components/comms/messages-workspace";
import type { MessageDraftSummary } from "@/lib/comms/message-draft";
import type { MessageFolder, MessageLabel, MessageThreadSummary } from "@/lib/dashboard/messages";
import type { MessageMailboxSettings } from "@/lib/dashboard/message-mailbox-settings";
import type { RealtimeConfig } from "@/lib/supabase/browser";

export function MessagesPageClient({
  folder,
  labelId,
  labels,
  threads,
  drafts = [],
  unreadInbox,
  favoriteCount,
  mailboxSettings,
  realtime,
}: {
  folder: MessageFolder | "draft";
  labelId: string | null;
  labels: MessageLabel[];
  threads: MessageThreadSummary[];
  drafts?: MessageDraftSummary[];
  unreadInbox: number;
  favoriteCount: number;
  mailboxSettings: MessageMailboxSettings;
  realtime: RealtimeConfig;
}) {
  return (
    <MessagesWorkspace
      folder={folder}
      labelId={labelId}
      labels={labels}
      threads={threads}
      drafts={drafts}
      unreadInbox={unreadInbox}
      favoriteCount={favoriteCount}
      mailboxSettings={mailboxSettings}
      realtime={realtime}
    />
  );
}
