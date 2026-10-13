/** Shared chat types (client + server). Kept out of `server-only` modules so
 * client components can import them freely. */

export type ChatChannel = "guardian" | "admin";

export type ChatConversationSummary = {
  id: string;
  channel: ChatChannel;
  kind: "admin" | "parent" | "student";
  counterpartName: string;
  classLabel: string;
  studentName: string;
  lastBody: string;
  lastAt: string;
  unread: boolean;
  avatarUrl: string | null;
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
  channel: ChatChannel;
  counterpartName: string;
  classLabel: string;
  studentName: string;
  messages: ChatMessageItem[];
  otherReadAt: string | null;
  avatarUrl: string | null;
};

/** Someone the teacher may start a chat with. */
export type ChatContact = {
  key: string;
  name: string;
  /** Class label (e.g. "1B"). */
  context: string;
  studentName: string;
  /** Class uuid — used for guardian ↔ student lookup. */
  classId?: string;
  /** Who this row is. Omitted on older guardian-only rows. */
  kind?: "admin" | "parent" | "student";
};
