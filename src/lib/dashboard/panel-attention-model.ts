/** Client-safe panel attention shape (no server loaders). */

export type PanelAttention = {
  gradingCount: number;
  unreadChatCount: number;
  unreadInboxCount: number;
  justificationCount: number;
  justificationHref: string | null;
};

/** Combined unread for the main nav Comunicación badge (inbox + guardian/admin chat). */
export function commsNavUnreadTotal(
  attention: Pick<PanelAttention, "unreadChatCount" | "unreadInboxCount">,
): number {
  return attention.unreadChatCount + attention.unreadInboxCount;
}
