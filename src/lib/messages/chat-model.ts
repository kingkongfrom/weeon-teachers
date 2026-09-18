/** Shared chat types (client + server). Kept out of `server-only` modules so
 * client components can import them freely. */

export type ChatConversationSummary = {
  id: string;
  counterpartName: string;
  classLabel: string;
  studentName: string;
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

export type ChatConversationDetail = {
  id: string;
  counterpartName: string;
  classLabel: string;
  studentName: string;
  messages: ChatMessageItem[];
};

/** A guardian the teacher may start a chat with. */
export type ChatContact = {
  key: string;
  name: string;
  /** Class label (e.g. "1B"). */
  context: string;
  studentName: string;
  /** Class uuid — used for guardian ↔ student lookup. */
  classId?: string;
};
