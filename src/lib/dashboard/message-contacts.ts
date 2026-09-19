import type { MessageContact } from "@/lib/dashboard/messages";

/** Stable list row id — recipient_key repeats (e.g. teacher profile across groups). */
export function contactRowId(contact: MessageContact): string {
  return `${contact.kind}:${contact.key}:${contact.classId ?? ""}:${contact.context}`;
}

export function dedupeMessageContacts(contacts: MessageContact[]): MessageContact[] {
  const map = new Map<string, MessageContact>();
  for (const contact of contacts) {
    map.set(contactRowId(contact), contact);
  }
  return [...map.values()];
}

/** Match a contact to a class by UUID and/or the group's display label (e.g. "1B"). */
export function contactMatchesClass(
  contact: MessageContact,
  classId: string,
  groupName: string,
): boolean {
  if (classId && contact.classId === classId) return true;
  if (!groupName.trim()) return false;
  const label = groupName.trim().toLowerCase();
  const context = contact.context.trim().toLowerCase();
  return context === label || context.includes(label);
}

/** Contacts in a class filtered by parent/student kind. */
export function contactsForClassScope(
  contacts: MessageContact[],
  classId: string,
  groupName: string,
  scope: "parents" | "students" | "teachers",
): MessageContact[] {
  const kind = scope === "parents" ? "parent" : scope === "students" ? "student" : "teacher";
  return contacts.filter(
    (contact) => contact.kind === kind && contactMatchesClass(contact, classId, groupName),
  );
}

export function filterContactsByKind(
  contacts: MessageContact[],
  allowed: Array<"parent" | "student" | "teacher">,
): MessageContact[] {
  const set = new Set(allowed);
  return contacts.filter((contact) => set.has(contact.kind as "parent" | "student" | "teacher"));
}

/** Circulares: families per class + one row per teacher (deduped). */
export function contactsForCircular(contacts: MessageContact[]): MessageContact[] {
  return [
    ...filterContactsByKind(contacts, ["parent", "student"]),
    ...uniqueTeacherContacts(contacts),
  ];
}

/** Dedupe teacher contacts that appear once per class. */
export function uniqueTeacherContacts(contacts: MessageContact[]): MessageContact[] {
  const byKey = new Map<string, MessageContact>();
  for (const contact of contacts) {
    if (contact.kind !== "teacher") continue;
    if (!byKey.has(contact.key)) byKey.set(contact.key, contact);
  }
  return [...byKey.values()];
}
