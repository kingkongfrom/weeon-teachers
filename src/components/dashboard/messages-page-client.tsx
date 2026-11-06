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
    /*
     * Height is the viewport minus the header minus the phone footer.
     *
     * The footer is `fixed`, so it is not in the flow and a pane sized
     * `100dvh - header` runs underneath it — the docked composer on Correo ended
     * up hidden behind the bar exactly as the chat one did. `md:` restores the
     * plain calculation because the footer is `md:hidden` above that breakpoint.
     */
    <div className="h-[calc(100dvh-4rem-var(--phone-nav-height)-env(safe-area-inset-bottom,0px))] min-h-[28rem] md:h-[calc(100dvh-9rem)]">
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
    </div>
  );
}
