import type { MessageThreadDetail } from "@/lib/dashboard/messages";

const threadDetailCache = new Map<string, MessageThreadDetail>();

export function getCachedThreadDetail(threadId: string): MessageThreadDetail | undefined {
  return threadDetailCache.get(threadId);
}

export function setCachedThreadDetail(threadId: string, detail: MessageThreadDetail): void {
  threadDetailCache.set(threadId, detail);
}

export function invalidateThreadDetailCache(threadId?: string): void {
  if (threadId) threadDetailCache.delete(threadId);
  else threadDetailCache.clear();
}
