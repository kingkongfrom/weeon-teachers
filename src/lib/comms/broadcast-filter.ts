import { formatGradeLabel } from "@/lib/dashboard/class-options";
import {
  partitionGradesByCycle,
  schoolCycleForGrade,
  type SchoolCycle,
} from "@/lib/dashboard/school-cycles";
import type { MessageContact } from "@/lib/dashboard/messages";

export type BroadcastReach = "school" | "cycle" | "grade" | "class";
export type BroadcastKind = "parents" | "students" | "teachers";

export type BroadcastFilter = {
  reach: BroadcastReach;
  cycle: SchoolCycle | null;
  grade: string | null;
  classId: string | null;
  kind: BroadcastKind;
};

export type CommsGroupWithGrade = {
  id: string;
  name: string;
  grade: string | null;
  studentCount: number;
  parentCount: number;
  teacherCount: number;
};

function normalizeGrade(value: string | null | undefined): string {
  return formatGradeLabel(value ?? "").replace(/°/g, "").trim();
}

export function groupsMatchingFilter(
  groups: CommsGroupWithGrade[],
  filter: BroadcastFilter,
): CommsGroupWithGrade[] {
  if (filter.reach === "class" && filter.classId) {
    return groups.filter((group) => group.id === filter.classId);
  }
  if (filter.reach === "grade" && filter.grade) {
    const target = normalizeGrade(filter.grade);
    return groups.filter((group) => normalizeGrade(group.grade) === target);
  }
  if (filter.reach === "cycle" && filter.cycle) {
    return groups.filter((group) => {
      const grade = group.grade ?? "";
      return grade.length > 0 && schoolCycleForGrade(grade) === filter.cycle;
    });
  }
  return groups;
}

export function classIdsMatchingFilter(
  groups: CommsGroupWithGrade[],
  filter: BroadcastFilter,
): string[] {
  return groupsMatchingFilter(groups, filter).map((group) => group.id);
}

function contactKindMatches(contact: MessageContact, kind: BroadcastKind): boolean {
  if (kind === "parents") return contact.kind === "parent";
  if (kind === "students") return contact.kind === "student";
  return contact.kind === "teacher";
}

/** Contacts in scope for the current broadcast filter (deduped by key). */
export function contactsMatchingBroadcast(
  contacts: MessageContact[],
  groups: CommsGroupWithGrade[],
  filter: BroadcastFilter,
): MessageContact[] {
  const classIds = new Set(classIdsMatchingFilter(groups, filter));
  const byKey = new Map<string, MessageContact>();

  for (const contact of contacts) {
    if (!contactKindMatches(contact, filter.kind)) continue;
    if (filter.reach === "school") {
      byKey.set(contact.key, contact);
      continue;
    }
    if (!contact.classId || !classIds.has(contact.classId)) continue;
    byKey.set(contact.key, contact);
  }

  if (filter.kind === "teachers") {
    return [...byKey.values()];
  }
  return [...byKey.values()];
}

export function broadcastRecipientCount(
  contacts: MessageContact[],
  groups: CommsGroupWithGrade[],
  filter: BroadcastFilter,
): number {
  return contactsMatchingBroadcast(contacts, groups, filter).length;
}

export function gradesInGroups(groups: CommsGroupWithGrade[]): string[] {
  const values = new Set<string>();
  for (const group of groups) {
    const grade = normalizeGrade(group.grade);
    if (grade) values.add(grade);
  }
  return [...values].sort((a, b) => Number(a) - Number(b));
}

export function cyclesInGroups(groups: CommsGroupWithGrade[]): SchoolCycle[] {
  const cycles = new Set<SchoolCycle>();
  for (const group of groups) {
    const cycle = group.grade ? schoolCycleForGrade(group.grade) : null;
    if (cycle) cycles.add(cycle);
  }
  return [...cycles];
}

export function partitionGroupGrades(groups: CommsGroupWithGrade[]): {
  primary: string[];
  secondary: string[];
} {
  return partitionGradesByCycle(gradesInGroups(groups));
}

export function defaultBroadcastFilter(
  groups: CommsGroupWithGrade[],
  kind: BroadcastKind = "parents",
): BroadcastFilter {
  const first = groups[0];
  return {
    reach: first ? "class" : "school",
    cycle: null,
    grade: first?.grade ? normalizeGrade(first.grade) : null,
    classId: first?.id ?? null,
    kind,
  };
}

export function broadcastFilterToJson(filter: BroadcastFilter): Record<string, string | null> {
  return {
    reach: filter.reach,
    cycle: filter.cycle,
    grade: filter.grade,
    classId: filter.classId,
    kind: filter.kind,
  };
}
