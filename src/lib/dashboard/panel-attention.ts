import "server-only";

import { cache } from "react";
import { loadChatConversations } from "@/lib/dashboard/chat";
import { loadGradingInbox } from "@/lib/dashboard/grading-inbox";
import { loadMessageSummaries } from "@/lib/dashboard/messages";

export type PanelAttention = {
  gradingCount: number;
  unreadChatCount: number;
  unreadInboxCount: number;
};

/** Actionable counts for Panel general — all loaders are request-cached. */
export const loadPanelAttention = cache(async (): Promise<PanelAttention> => {
  const [inbox, chats, grading] = await Promise.all([
    loadMessageSummaries("inbox"),
    loadChatConversations(),
    loadGradingInbox(),
  ]);

  return {
    gradingCount: grading.length,
    unreadChatCount: chats.filter((row) => row.unread).length,
    unreadInboxCount: inbox.filter((row) => row.unread).length,
  };
});
