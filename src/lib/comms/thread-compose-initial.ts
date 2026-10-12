import type { PickerSelection } from "@/components/comms/recipient-picker-modal";

/** Same rule as mailbox list (`formatSentCounterpart`): 1–2 names, else first +N. */
const COLLAPSE_TO_PARA_AFTER = 2;
import type { ComposeThreadHistoryMessage } from "@/lib/comms/message-draft";
import { emptyDoc, type RichTextDoc } from "@/lib/comms/model";
import { formatThreadRecipientsLine } from "@/lib/comms/recipient-display-summary";
import type { TenantEmailIdentity } from "@/lib/email/tenant-from";
import {
  buildBulkRecipientCatalog,
  type BulkRecipientItem,
} from "@/lib/comms/recipient-catalog";
import type { BroadcastFilter, CommsGroupWithGrade } from "@/lib/comms/broadcast-filter";
import type { SchoolCycle } from "@/lib/dashboard/school-cycles";
import type { MessageContact, MessageThreadDetail } from "@/lib/dashboard/messages";

export type ThreadComposeSeed = {
  subject: string;
  body: RichTextDoc;
  toSelected: PickerSelection[];
  ccSelected: { key: string; name: string }[];
  allowReplies: boolean;
  threadHistory: ComposeThreadHistoryMessage[];
};

function filtersEqual(a: BroadcastFilter, b: BroadcastFilter): boolean {
  return (
    a.reach === b.reach &&
    a.cycle === b.cycle &&
    a.grade === b.grade &&
    a.classId === b.classId &&
    a.kind === b.kind
  );
}

export function parseStoredBroadcastFilter(raw: unknown): BroadcastFilter | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const reach = row.reach;
  const kind = row.kind;
  if (reach !== "school" && reach !== "cycle" && reach !== "grade" && reach !== "class") {
    return null;
  }
  if (kind !== "parents" && kind !== "students" && kind !== "teachers") {
    return null;
  }
  return {
    reach,
    kind,
    cycle:
      row.cycle === "primaria" || row.cycle === "secundaria"
        ? (row.cycle as SchoolCycle)
        : null,
    grade: typeof row.grade === "string" ? row.grade : null,
    classId: typeof row.classId === "string" ? row.classId : null,
  };
}

function bulkItemForFilter(
  groups: CommsGroupWithGrade[],
  filter: BroadcastFilter,
): BulkRecipientItem | null {
  const catalog = buildBulkRecipientCatalog(groups);
  return catalog.find((item) => filtersEqual(item.filter, filter)) ?? null;
}

function contactsFromRecipients(
  toRecipients: MessageThreadDetail["recipients"],
  contacts: MessageContact[],
): PickerSelection[] {
  const byKey = new Map(contacts.map((contact) => [contact.key, contact]));
  const seen = new Set<string>();
  const selections: PickerSelection[] = [];
  for (const recipient of toRecipients) {
    if (recipient.role !== "to") continue;
    const key = (recipient.contactKey || recipient.profileId).trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    const match = byKey.get(key);
    selections.push({
      type: "contact",
      key,
      name: match?.name ?? recipient.name,
    });
  }
  return selections;
}

function collapsedToSelection(
  threadId: string,
  label: string,
  toRecipients: MessageThreadDetail["recipients"],
): PickerSelection {
  const members: Array<{ key: string; name: string }> = [];
  const seen = new Set<string>();
  for (const recipient of toRecipients) {
    if (recipient.role !== "to") continue;
    const key = (recipient.contactKey || recipient.profileId).trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    members.push({ key, name: recipient.name });
  }
  return {
    type: "collapsed",
    key: `thread:${threadId}:to`,
    label: label.trim() || members[0]?.name || "",
    members,
  };
}

function replyToAuthorSelection(
  detail: MessageThreadDetail,
  contacts: MessageContact[],
): PickerSelection[] {
  const inbound = detail.messages.find((message) => !message.mine);
  const label = inbound?.authorName?.trim() || detail.summary.counterpart.trim();
  if (!label) return [];
  const match =
    contacts.find((contact) => contact.name.trim() === label) ??
    contacts.find((contact) => contact.name.trim().startsWith(label.split(" ")[0] ?? ""));
  if (match) {
    return [{ type: "contact", key: match.key, name: match.name }];
  }
  return [{ type: "contact", key: `reply:${detail.summary.id}`, name: label }];
}

export function composeHistoryFromLabel(
  message: { mine: boolean; authorName: string },
  identity: TenantEmailIdentity,
): string {
  if (!message.mine) {
    return message.authorName.trim() || identity.displayName || "Administración";
  }
  const name =
    identity.displayName.trim() || message.authorName.trim() || identity.displayName;
  if (identity.replyTo) {
    const label = name.trim();
    return label ? `${label} <${identity.replyTo}>` : identity.replyTo;
  }
  return identity.from.trim() || name;
}

/** Map a loaded thread into unified composer fields (mailbox preview pane). */
export function threadDetailToComposeSeed(
  detail: MessageThreadDetail,
  contacts: MessageContact[],
  groups: CommsGroupWithGrade[],
  senderIdentity: TenantEmailIdentity,
): ThreadComposeSeed {
  const subjectRaw = detail.summary.subject.trim();
  const subject = subjectRaw === "(Sin asunto)" ? "" : subjectRaw;

  const toRecipients = detail.recipients.filter((row) => row.role === "to");
  const ccSelected = detail.recipients
    .filter((row) => row.role === "cc")
    .map((row) => ({ key: row.contactKey || row.profileId, name: row.name }));

  let toSelected: PickerSelection[] = [];

  if (detail.broadcastFilter) {
    const bulk = bulkItemForFilter(groups, detail.broadcastFilter);
    if (bulk) toSelected = [{ type: "bulk", item: bulk }];
  }

  if (
    toSelected.length === 0 &&
    detail.summary.audience === "group" &&
    detail.classId &&
    detail.summary.recipientScope &&
    detail.summary.recipientScope !== "custom"
  ) {
    const catalog = buildBulkRecipientCatalog(groups);
    const id = `class:${detail.classId}:${detail.summary.recipientScope}`;
    const bulk = catalog.find((item) => item.id === id);
    if (bulk) toSelected = [{ type: "bulk", item: bulk }];
  }

  if (toSelected.length === 0 && detail.summary.mine) {
    const toCount = toRecipients.length;
    if (toCount > COLLAPSE_TO_PARA_AFTER) {
      toSelected = [
        collapsedToSelection(detail.summary.id, detail.summary.counterpart, toRecipients),
      ];
    } else {
      toSelected = contactsFromRecipients(toRecipients, contacts);
    }
  }

  if (toSelected.length === 0 && !detail.summary.mine) {
    toSelected = replyToAuthorSelection(detail, contacts);
  }

  const historySubject = subjectRaw || "(Sin asunto)";
  const toNames = toRecipients.map((row) => row.name).filter(Boolean);
  const historyToLabel = formatThreadRecipientsLine(toNames, detail.summary.counterpart);

  const threadHistory: ComposeThreadHistoryMessage[] = detail.messages.map((message) => ({
    id: message.id,
    fromLabel: composeHistoryFromLabel(message, senderIdentity),
    toLabel: historyToLabel,
    subject: historySubject,
    sentAt: message.createdAt,
    body: message.body,
  }));

  return {
    subject,
    body: emptyDoc(),
    toSelected,
    ccSelected,
    allowReplies: detail.allowReplies,
    threadHistory,
  };
}
