import "server-only";

import { cache } from "react";
import { loadChatConversations } from "@/lib/dashboard/chat";
import { loadGradingInbox } from "@/lib/dashboard/grading-inbox";
import { loadJustificationInbox } from "@/lib/dashboard/justification-inbox";
import { loadMessageSummaries } from "@/lib/dashboard/messages";
import type { PanelAttention } from "@/lib/dashboard/panel-attention-model";

export type { PanelAttention } from "@/lib/dashboard/panel-attention-model";
export { commsNavUnreadTotal } from "@/lib/dashboard/panel-attention-model";

/** Actionable counts for Panel general — all loaders are request-cached. */
export const loadPanelAttention = cache(async (): Promise<PanelAttention> => {
  const [inbox, chats, grading, justifications] = await Promise.all([
    loadMessageSummaries("inbox"),
    loadChatConversations(),
    loadGradingInbox(),
    loadJustificationInbox(),
  ]);

  return {
    gradingCount: grading.length,
    unreadChatCount: chats.filter((row) => row.unread).length,
    unreadInboxCount: inbox.filter((row) => row.unread).length,
    justificationCount: justifications.length,
    justificationHref: justifications.length > 0 ? "/aula-virtual/justificaciones" : null,
  };
});
