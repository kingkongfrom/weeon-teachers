/** Shared chat types (client + server). Kept out of `server-only` modules so
 * client components can import them freely. */

export type ChatConversationSummary = {
  id: string;
  counterpartName: string;
  lastBody: string;
  lastAt: string;
  unread: boolean;
};

export type ChatMessageItem = {
  id: string;
  body: string;
  createdAt: string;
  mine: boolean;
  authorName: string;
};

/** A guardian the teacher may start a chat with. */
export type ChatContact = {
  key: string;
  name: string;
  context: string;
};
