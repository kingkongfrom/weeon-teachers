/** Shared chat types (client + server). Kept out of `server-only` modules so
 * client components can import them freely. */

export type ChatChannel = "guardian" | "admin";

export type ChatConversationSummary = {
  id: string;
  channel: ChatChannel;
  kind: "admin" | "teacher" | "parent" | "student";
  counterpartName: string;
  classLabel: string;
  studentName: string;
  lastBody: string;
  lastAt: string;
  unread: boolean;
  avatarUrl: string | null;
  /**
   * The school logo, for staff rows. `avatarUrl` stays the PERSON photo so the
   * avatar can fall back logo -> person -> initials instead of logo -> initials.
   */
  schoolLogoUrl?: string | null;
};

export type ChatMessageReply = {
  /** Id of the quoted message -- the ORIGINAL when the target was itself a reply. */
  id: string;
  senderName: string;
  /** Truncated to 140 characters server-side. */
  preview: string;
  createdAt: string;
};

export type ChatMessageItem = {
  id: string;
  body: string;
  createdAt: string;
  mine: boolean;
  authorName: string;
  /** Present only when this message answers another (docs/chat-replies.md). */
  replyTo?: ChatMessageReply;
  /**
   * Aggregated reactions (docs/chat-reactions.md).
   *
   * ALWAYS an array, never undefined -- every message has zero or more, and no
   * reader should need a null check. The optional reply field taught that lesson.
   */
  reactions: ChatMessageReaction[];
};

/** One emoji and everybody who chose it. */
export type ChatMessageReaction = {
  emoji: string;
  count: number;
  names: string[];
  mine: boolean;
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
  /**
   * The school logo, for staff rows. `avatarUrl` stays the PERSON photo so the
   * avatar can fall back logo -> person -> initials instead of logo -> initials.
   */
  schoolLogoUrl?: string | null;
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
  kind?: "admin" | "teacher" | "parent" | "student";
  avatarUrl?: string | null;
};
