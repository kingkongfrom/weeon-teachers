import type { MessageRecipient } from "@/lib/dashboard/messages";

/** One row per roster identity — bulk sends can insert duplicate display names. */
export function dedupeMessageRecipients(recipients: MessageRecipient[]): MessageRecipient[] {
  const byKey = new Map<string, MessageRecipient>();
  for (const row of recipients) {
    const key = row.profileId.trim() || row.name.trim();
    if (!key) continue;
    const prev = byKey.get(key);
    if (!prev) {
      byKey.set(key, row);
      continue;
    }
    byKey.set(key, {
      ...prev,
      readAt: latestReadAt(prev.readAt, row.readAt),
    });
  }
  return [...byKey.values()];
}

function latestReadAt(a: string | null, b: string | null): string | null {
  if (a && b) return new Date(a) >= new Date(b) ? a : b;
  return a ?? b;
}

export function partitionReadRecipients(recipients: MessageRecipient[]): {
  read: MessageRecipient[];
  unreadCount: number;
} {
  const deduped = dedupeMessageRecipients(recipients);
  const read = deduped.filter((row) => row.readAt);
  const unreadCount = deduped.length - read.length;
  read.sort((a, b) => {
    const at = a.readAt ? new Date(a.readAt).getTime() : 0;
    const bt = b.readAt ? new Date(b.readAt).getTime() : 0;
    return bt - at;
  });
  return { read, unreadCount };
}

export const READ_RECEIPT_NAME_CAP = 40;
export const UNREAD_RECEIPT_NAME_CAP = 15;
