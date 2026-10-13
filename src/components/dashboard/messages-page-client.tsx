"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { MessagesWorkspace } from "@/components/comms/messages-workspace";
import { COMMS_BASE } from "@/lib/comms/paths";
import type { MessageDraftSummary } from "@/lib/comms/message-draft";
import type { MessageFolder, MessageLabel, MessageThreadSummary } from "@/lib/dashboard/messages";
import type { MessageMailboxSettings } from "@/lib/dashboard/message-mailbox-settings";
import type { RealtimeConfig } from "@/lib/supabase/browser";
import { useT } from "@/lib/i18n/use-i18n";

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
  const t = useT();

  return (
    <div className="flex h-[calc(100dvh-14rem)] min-h-[28rem] flex-col gap-3 md:h-[calc(100dvh-11rem)]">
      <Link
        href={COMMS_BASE}
        className="ui-hover inline-flex w-fit shrink-0 items-center gap-1.5 text-sm font-semibold text-foreground/55 hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("comms.backToHub")}
      </Link>

      <div className="min-h-0 w-full flex-1">
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
    </div>
  );
}
