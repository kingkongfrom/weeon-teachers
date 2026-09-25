import "server-only";

import { cache } from "react";
import { loadChatConversations } from "@/lib/dashboard/chat";
import { loadGradingInbox } from "@/lib/dashboard/grading-inbox";
import { loadJustificationInbox } from "@/lib/dashboard/justification-inbox";
import { loadMessageSummaries } from "@/lib/dashboard/messages";

export type PanelAttention = {
  gradingCount: number;
  unreadChatCount: number;
  unreadInboxCount: number;
  justificationCount: number;
  justificationHref: string | null;
};

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
    justificationHref:
      justifications.length === 1
        ? `/aula-virtual/${justifications[0].classId}?tab=asistencia&date=${justifications[0].date}`
        : justifications.length > 1
          ? "/aula-virtual/justificaciones"
          : null,
  };
});
