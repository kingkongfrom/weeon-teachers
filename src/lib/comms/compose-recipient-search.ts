import { contactRowId } from "@/lib/dashboard/message-contacts";
import type { MessageContact } from "@/lib/dashboard/messages";
import type { PickerSelection } from "@/components/comms/recipient-picker-modal";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function contactHaystack(contact: MessageContact): string {
  const parts = [contact.name, contact.context, contact.studentName, contact.email]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return parts;
}

export function searchMessageContacts(
  contacts: MessageContact[],
  query: string,
  limit = 8,
): MessageContact[] {
  const term = query.trim().toLowerCase();
  if (!term) return [];

  const isEmail = term.includes("@");
  const scored: Array<{ contact: MessageContact; score: number }> = [];

  for (const contact of contacts) {
    const name = contact.name.trim().toLowerCase();
    const email = contact.email?.trim().toLowerCase() ?? "";
    let score = 0;

    if (isEmail && email === term) score = 100;
    else if (isEmail && email.startsWith(term)) score = 80;
    else if (name === term) score = 90;
    else if (name.startsWith(term)) score = 70;
    else if (contactHaystack(contact).includes(term)) score = 50;

    if (score > 0) scored.push({ contact, score });
  }

  scored.sort((a, b) => b.score - a.score || a.contact.name.localeCompare(b.contact.name));

  const seen = new Set<string>();
  const out: MessageContact[] = [];
  for (const row of scored) {
    const id = contactRowId(row.contact);
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(row.contact);
    if (out.length >= limit) break;
  }
  return out;
}

export function resolveTypedRecipientToken(
  contacts: MessageContact[],
  token: string,
): MessageContact | null {
  const trimmed = token.trim();
  if (!trimmed) return null;

  const matches = searchMessageContacts(contacts, trimmed, 12);
  if (matches.length === 0) return null;

  const term = trimmed.toLowerCase();
  const exactEmail = matches.find(
    (row) => normalizeEmail(row.email ?? "") === normalizeEmail(term),
  );
  if (exactEmail) return exactEmail;

  const exactName = matches.find((row) => row.name.trim().toLowerCase() === term);
  if (exactName) return exactName;

  if (matches.length === 1) return matches[0]!;

  const prefix = matches.filter((row) => row.name.trim().toLowerCase().startsWith(term));
  if (prefix.length === 1) return prefix[0]!;

  return null;
}

export function selectionHasContactKey(
  selections: PickerSelection[],
  contactKey: string,
): boolean {
  const key = contactKey.trim();
  return selections.some((item) => item.type === "contact" && item.key.trim() === key);
}

export function addContactSelection(
  selections: PickerSelection[],
  contact: MessageContact,
): PickerSelection[] {
  if (selectionHasContactKey(selections, contact.key)) return selections;
  const withoutBulk = selections.filter((item) => item.type !== "bulk");
  return [
    ...withoutBulk,
    { type: "contact", key: contact.key, name: contact.name.trim() || contact.key },
  ];
}

export function isLikelyUuid(value: string): boolean {
  return UUID_RE.test(value.trim());
}
