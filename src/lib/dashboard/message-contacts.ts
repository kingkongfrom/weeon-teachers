import type { MessageContact } from "@/lib/dashboard/messages";

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
  scope: "parents" | "students",
): MessageContact[] {
  const kind = scope === "parents" ? "parent" : "student";
  return contacts.filter(
    (contact) => contact.kind === kind && contactMatchesClass(contact, classId, groupName),
  );
}
