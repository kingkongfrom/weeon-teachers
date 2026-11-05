export type ChatLiveMessage = {
  id: string;
  body: string;
  createdAt: string;
  mine: boolean;
  authorName: string;
};

export function mergeChatMessages<T extends ChatLiveMessage>(
  previous: T[],
  incoming: T[],
): T[] {
  if (incoming.length === 0) return previous;
  const byId = new Map<string, T>();
  for (const message of previous) byId.set(message.id, message);
  for (const message of incoming) byId.set(message.id, message);
  return [...byId.values()].sort(
    (left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
  );
}
