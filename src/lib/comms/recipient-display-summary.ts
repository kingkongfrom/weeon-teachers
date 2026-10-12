/** Avoid rendering dozens of names in Para / thread headers — use mailbox counterpart. */

const INLINE_RECIPIENT_NAME_MAX = 3;

export function formatThreadRecipientsLine(
  recipientNames: string[],
  counterpart: string,
): string {
  const unique = [...new Set(recipientNames.map((name) => name.trim()).filter(Boolean))];
  if (unique.length === 0) return counterpart;
  if (unique.length <= INLINE_RECIPIENT_NAME_MAX) return unique.join(", ");
  return counterpart;
}
