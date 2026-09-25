import type { Metadata } from "next";
import { MessagesPageClient } from "@/components/dashboard/messages-page-client";
import {
  loadCommsFavoriteCount,
  loadCommsUnreadCount,
  loadMessageLabels,
  loadMessageSummaries,
  type MessageFolder,
} from "@/lib/dashboard/messages";
import { loadMessageDrafts } from "@/lib/dashboard/message-drafts";
import { loadMessageMailboxSettings } from "@/lib/dashboard/message-mailbox-settings";
import { getLocale } from "@/lib/i18n/server";
import { tComms } from "@/lib/i18n/translate-comms";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return { title: tComms(locale, "comms.messagesMetaTitle") };
}

function parseFolder(value: string | undefined): MessageFolder | "draft" {
  if (value === "inbox" || value === "trash" || value === "favorite") return value;
  if (value === "drafts") return "draft";
  return "sent";
}

function parseLabelId(value: string | undefined): string | null {
  if (!value) return null;
  return /^[0-9a-f-]{36}$/i.test(value) ? value : null;
}

/** School messaging — same workspace as tenants Comunicación. */
export default async function MensajesPage({
  searchParams,
}: {
  searchParams: Promise<{ folder?: string; label?: string }>;
}) {
  const { folder: folderParam, label: labelParam } = await searchParams;
  const labelId = parseLabelId(labelParam);
  const folder = labelId ? "sent" : parseFolder(folderParam);

  const [threads, drafts, unreadInbox, favoriteCount, labels, mailboxSettings] = await Promise.all([
    folder === "draft" ? Promise.resolve([]) : loadMessageSummaries(folder, null, labelId),
    loadMessageDrafts(),
    loadCommsUnreadCount(),
    loadCommsFavoriteCount(),
    loadMessageLabels(),
    loadMessageMailboxSettings(),
  ]);

  return (
    <MessagesPageClient
      folder={folder}
      labelId={labelId}
      labels={labels}
      threads={threads}
      drafts={drafts}
      unreadInbox={unreadInbox}
      favoriteCount={favoriteCount}
      mailboxSettings={mailboxSettings}
    />
  );
}
