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
     * THIS WRAPPER MUST NOT SET A HEIGHT.
     *
     * It used to duplicate the pane maths: a phone height that omitted the nudge,
     * plus a separate desktop height of `100dvh - 9rem`. The `.comms-fill` pane
     * in `comunicacion/layout.tsx` ALREADY sizes the section from the header down
     * to the bottom bar, with the phone nudge. A second height here overrode it:
     * at 846px tall the desktop value resolved to 702px, leaving the message list
     * 80px short of the pane's bottom — measured identically at 1024, 1280, 1440
     * and 1560 wide, which is the white band under the list on a laptop.
     *
     * Inheriting the pane's height instead of recomputing it means there is one
     * source of truth, and the list fills to the bottom at every size.
     *
     * (Do not write a Tailwind class into this comment: the scanner compiles
     * arbitrary values found in comments too, and a placeholder inside one is
     * enough to fail the CSS build.)
     */
    <div className="h-full min-h-0">
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
