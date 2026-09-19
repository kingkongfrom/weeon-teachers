import type { BroadcastFilter, BroadcastKind, CommsGroupWithGrade } from "@/lib/comms/broadcast-filter";
import { contactsMatchingBroadcast, cyclesInGroups } from "@/lib/comms/broadcast-filter";
import { schoolCycleForGrade } from "@/lib/dashboard/school-cycles";
import type { MessageContact } from "@/lib/dashboard/messages";

export type BulkRecipientCategory = "sections" | "sectors" | "staff";

export type BulkRecipientItem = {
  id: string;
  label: string;
  subtitle: string;
  category: BulkRecipientCategory;
  kind: BroadcastKind;
  filter: BroadcastFilter;
};

const KIND_LABEL: Record<BroadcastKind, string> = {
  parents: "Encargados",
  students: "Estudiantes",
  teachers: "Docentes",
};

const CYCLE_LABEL: Record<string, string> = {
  primaria: "Primaria",
  secundaria: "Secundaria",
};

function classBulkItem(group: CommsGroupWithGrade, kind: BroadcastKind): BulkRecipientItem {
  return {
    id: `class:${group.id}:${kind}`,
    label: group.name,
    subtitle: KIND_LABEL[kind],
    category: "sections",
    kind,
    filter: {
      reach: "class",
      cycle: null,
      grade: null,
      classId: group.id,
      kind,
    },
  };
}

function sectorBulkItem(cycle: "primaria" | "secundaria", kind: BroadcastKind): BulkRecipientItem {
  return {
    id: `cycle:${cycle}:${kind}`,
    label: CYCLE_LABEL[cycle] ?? cycle,
    subtitle: KIND_LABEL[kind],
    category: "sectors",
    kind,
    filter: {
      reach: "cycle",
      cycle,
      grade: null,
      classId: null,
      kind,
    },
  };
}

export function buildBulkRecipientCatalog(groups: CommsGroupWithGrade[]): BulkRecipientItem[] {
  const items: BulkRecipientItem[] = [];
  const kinds: BroadcastKind[] = ["parents", "students", "teachers"];

  for (const group of groups) {
    for (const kind of kinds) {
      if (kind === "students" && group.studentCount === 0) continue;
      if (kind === "parents" && group.parentCount === 0) continue;
      if (kind === "teachers" && group.teacherCount === 0) continue;
      items.push(classBulkItem(group, kind));
    }
  }

  // Teacher web: class-scoped bulk only (no school/cycle broadcast lanes).
  return items;
}

/** Resolve one or more bulk picks into deduped roster keys for a single send. */
export function recipientsFromBulkSelections(
  bulkItems: BulkRecipientItem[],
  contacts: MessageContact[],
  groups: CommsGroupWithGrade[],
): Array<{ key: string; name: string }> {
  const byKey = new Map<string, { key: string; name: string }>();
  for (const item of bulkItems) {
    for (const contact of contactsMatchingBroadcast(contacts, groups, item.filter)) {
      byKey.set(contact.key, { key: contact.key, name: contact.name });
    }
  }
  return [...byKey.values()];
}

export function filterBulkCatalog(
  items: BulkRecipientItem[],
  query: string,
  category: "all" | BulkRecipientCategory,
): BulkRecipientItem[] {
  const term = query.trim().toLowerCase();
  return items.filter((item) => {
    if (category !== "all" && item.category !== category) return false;
    if (!term) return true;
    return (
      item.label.toLowerCase().includes(term) ||
      item.subtitle.toLowerCase().includes(term) ||
      item.category.toLowerCase().includes(term)
    );
  });
}

export function contactKindLabel(kind: string): BroadcastKind | null {
  if (kind === "parent") return "parents";
  if (kind === "student") return "students";
  if (kind === "teacher") return "teachers";
  return null;
}

export function groupNameForContact(
  contact: MessageContact,
  groups: CommsGroupWithGrade[],
): string | null {
  if (contact.classId) {
    return groups.find((group) => group.id === contact.classId)?.name ?? contact.context ?? null;
  }
  return contact.context || null;
}

export function cycleLabelForGroup(group: CommsGroupWithGrade): string | null {
  if (!group.grade) return null;
  const cycle = schoolCycleForGrade(group.grade);
  return cycle ? (CYCLE_LABEL[cycle] ?? cycle) : null;
}
