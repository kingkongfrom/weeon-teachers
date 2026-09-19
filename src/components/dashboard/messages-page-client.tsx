"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { MessagesWorkspace } from "@/components/comms/messages-workspace";
import { COMMS_BASE } from "@/lib/comms/paths";
import type { MessageFolder, MessageLabel, MessageThreadSummary } from "@/lib/dashboard/messages";
import type { MessageMailboxSettings } from "@/lib/dashboard/message-mailbox-settings";
import { useT } from "@/lib/i18n/use-i18n";

export function MessagesPageClient({
  folder,
  labelId,
  labels,
  threads,
  unreadInbox,
  favoriteCount,
  mailboxSettings,
}: {
  folder: MessageFolder;
  labelId: string | null;
  labels: MessageLabel[];
  threads: MessageThreadSummary[];
  unreadInbox: number;
  favoriteCount: number;
  mailboxSettings: MessageMailboxSettings;
}) {
  const t = useT();

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <Link
          href={COMMS_BASE}
          className="ui-hover inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-foreground/55 hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("comms.backToHome")}
        </Link>
        <div>
          <h1 className="brand-page-title text-2xl text-foreground sm:text-3xl">
            {t("comms.messagesTitle")}
          </h1>
          <p className="mt-1.5 max-w-prose text-sm font-medium text-foreground/55">
            {t("comms.messagesDescription")}
          </p>
        </div>
      </header>

      <MessagesWorkspace
        folder={folder}
        labelId={labelId}
        labels={labels}
        threads={threads}
        unreadInbox={unreadInbox}
        favoriteCount={favoriteCount}
        mailboxSettings={mailboxSettings}
      />
    </div>
  );
}
