/** Compact mailbox row labels for Para / De columns. */

export type MessageRecipientScope = "parents" | "students" | "teachers" | "custom" | null;

export function formatSentCounterpart(
  names: string[],
  audience: "individual" | "group",
  className: string | null,
  recipientCount: number,
  labels: {
    noRecipients: string;
    recipientCount: (n: number) => string;
    parentCount: (n: number) => string;
    studentCount: (n: number) => string;
    teacherCount: (n: number) => string;
    customCount: (n: number) => string;
  },
  recipientScope: MessageRecipientScope = null,
): string {
  const unique = [...new Set(names.map((name) => name.trim()).filter(Boolean))];
  if (audience === "group") {
    const count = recipientCount || unique.length;
    const prefix = className ? `${className} · ` : "";
    if (count <= 0) return labels.noRecipients;
    if (recipientScope === "parents") return `${prefix}${labels.parentCount(count)}`;
    if (recipientScope === "students") return `${prefix}${labels.studentCount(count)}`;
    if (recipientScope === "teachers") return `${prefix}${labels.teacherCount(count)}`;
    if (recipientScope === "custom") return `${prefix}${labels.customCount(count)}`;
    return `${prefix}${labels.recipientCount(count)}`;
  }
  if (unique.length === 0) return labels.noRecipients;
  if (unique.length <= 2) return unique.join(", ");
  return `${unique[0]} +${unique.length - 1}`;
}
