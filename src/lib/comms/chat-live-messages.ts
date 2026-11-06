export type ChatLiveMessage = {
  id: string;
  body: string;
  createdAt: string;
  mine: boolean;
  authorName: string;
};

/**
 * Merge live messages into the list already on screen.
 *
 * INCOMING ROWS DO NOT ERASE WHAT THE LOCAL ROW ALREADY KNOWS.
 *
 * This used to be a plain "incoming wins" map, and that lost data. The flow that
 * exposed it:
 *
 *   1. the sender's optimistic row is built WITH its reply quote;
 *   2. the socket echoes the same message back as a broadcast, which carries no
 *      quote (a broadcast payload is id/body/author/time — there is nothing else
 *      in it);
 *   3. "incoming wins" replaced the full row with the emptier one.
 *
 * The result was the bug the owner reported: the sender's own reply showed only
 * their typed message, and the quote appeared later, after a reload replaced
 * everything from the database. The recipient saw the quote immediately, because
 * their row came from the database in the first place.
 *
 * So a field is taken from the incoming row only when the incoming row actually
 * has something: `undefined` and `null` mean "this source does not carry that",
 * never "clear it".
 */
export function mergeChatMessages<T extends ChatLiveMessage>(
  previous: T[],
  incoming: T[],
): T[] {
  if (incoming.length === 0) return previous;
  const byId = new Map<string, T>();
  for (const message of previous) byId.set(message.id, message);
  for (const message of incoming) {
    const existing = byId.get(message.id);
    byId.set(
      message.id,
      existing ? mergeOne(existing, message) : message,
    );
  }
  return [...byId.values()].sort(
    (left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
  );
}

function mergeOne<T extends ChatLiveMessage>(existing: T, incoming: T): T {
  const merged: Record<string, unknown> = { ...existing };
  for (const [key, value] of Object.entries(incoming)) {
    if (value === undefined || value === null) continue;
    /* An empty array means "this source carries none", not "clear the list". */
    if (Array.isArray(value) && value.length === 0) continue;
    merged[key] = value;
  }
  return merged as T;
}
