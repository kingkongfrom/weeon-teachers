import type { CommsTranslateFn } from "@/lib/i18n/translate-comms";
import type { BroadcastFilter, BroadcastKind } from "@/lib/comms/broadcast-filter";
import { formatGradeLabel } from "@/lib/dashboard/class-options";

export function countLabel(
  t: CommsTranslateFn,
  n: number,
  oneKey: "comms.selectedOne" | "comms.parentOne" | "comms.studentOne" | "comms.customOne" | "comms.recipientOne",
  manyKey: "comms.selectedMany" | "comms.parentMany" | "comms.studentMany" | "comms.customMany" | "comms.recipientMany",
): string {
  return n === 1 ? t(oneKey) : t(manyKey, { n });
}

export function groupWholeParentsLabel(t: CommsTranslateFn, n: number): string {
  if (n <= 0) return t("comms.groupWholeParentsEmpty");
  return t("comms.groupWholeParents", { n });
}

export function groupWholeStudentsLabel(t: CommsTranslateFn, n: number): string {
  if (n <= 0) return t("comms.groupWholeStudentsEmpty");
  return t("comms.groupWholeStudents", { n });
}

export function groupSubsetLabel(t: CommsTranslateFn, n: number): string {
  return countLabel(t, n, "comms.recipientOne", "comms.recipientMany");
}

export function groupWholeTeachersLabel(t: CommsTranslateFn, n: number): string {
  if (n <= 0) return t("comms.groupWholeTeachersEmpty");
  return t("comms.groupWholeTeachers", { n });
}

function audienceCountLabel(t: CommsTranslateFn, kind: BroadcastKind, n: number): string {
  if (n <= 0) {
    if (kind === "parents") return t("comms.groupWholeParentsEmpty");
    if (kind === "students") return t("comms.groupWholeStudentsEmpty");
    return t("comms.groupWholeTeachersEmpty");
  }
  if (kind === "parents") return t("comms.parentMany", { n });
  if (kind === "students") return t("comms.studentMany", { n });
  return t("comms.teacherMany", { n });
}

/** Summary line for a broadcast filter (whole audience, no manual subset). */
export function broadcastWholeLabel(
  t: CommsTranslateFn,
  filter: BroadcastFilter,
  count: number,
  groupName?: string,
): string {
  const audience = audienceCountLabel(t, filter.kind, count);
  if (filter.reach === "school") return t("comms.broadcastWholeSchool", { audience });
  if (filter.reach === "cycle" && filter.cycle === "primaria") {
    return t("comms.broadcastWholePrimary", { audience });
  }
  if (filter.reach === "cycle" && filter.cycle === "secundaria") {
    return t("comms.broadcastWholeSecondary", { audience });
  }
  if (filter.reach === "grade" && filter.grade) {
    return t("comms.broadcastWholeGrade", {
      grade: formatGradeLabel(filter.grade),
      audience,
    });
  }
  if (filter.reach === "class" && groupName) {
    return t("comms.broadcastWholeClass", { group: groupName, audience });
  }
  return audience;
}
