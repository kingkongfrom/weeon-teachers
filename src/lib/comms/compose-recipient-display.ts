import type { PickerSelection } from "@/components/comms/recipient-picker-modal";
import { bulkItemRoleLabel } from "@/lib/comms/recipient-catalog";

export const PARA_VISIBLE_RECIPIENT_MAX = 5;

function pickerDisplayName(selection: PickerSelection): string {
  if (selection.type === "contact") return selection.name;
  if (selection.type === "collapsed") return selection.label;
  return `${selection.item.label} · ${bulkItemRoleLabel(selection.item)}`;
}

/** Flatten Para picks into deduped rows for inline display (contacts, bulk label, collapsed members). */
export function flattenParaRecipients(selections: PickerSelection[]): Array<{ key: string; name: string }> {
  const rows: Array<{ key: string; name: string }> = [];
  const seen = new Set<string>();

  for (const selection of selections) {
    if (selection.type === "collapsed") {
      for (const member of selection.members) {
        const key = member.key.trim();
        if (!key || seen.has(key)) continue;
        seen.add(key);
        rows.push({ key, name: member.name.trim() || key });
      }
      continue;
    }
    if (selection.type === "contact") {
      const key = selection.key.trim();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      rows.push({ key, name: selection.name.trim() || key });
      continue;
    }
    const key = selection.item.id;
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push({ key, name: pickerDisplayName(selection) });
  }

  return rows;
}

export function splitVisibleParaRecipients(
  selections: PickerSelection[],
  maxVisible = PARA_VISIBLE_RECIPIENT_MAX,
): { visible: Array<{ key: string; name: string }>; hiddenCount: number } {
  const all = flattenParaRecipients(selections);
  const visible = all.slice(0, maxVisible);
  return { visible, hiddenCount: Math.max(0, all.length - visible.length) };
}

/** Remove one flattened Para row key from picker selections. */
export function removeParaRecipientKey(
  selections: PickerSelection[],
  removeKey: string,
): PickerSelection[] {
  const key = removeKey.trim();
  if (!key) return selections;

  const next: PickerSelection[] = [];

  for (const selection of selections) {
    if (selection.type === "contact") {
      if (selection.key.trim() !== key) next.push(selection);
      continue;
    }
    if (selection.type === "bulk") {
      if (selection.item.id !== key) next.push(selection);
      continue;
    }
    const members = selection.members.filter((member) => member.key.trim() !== key);
    if (members.length === 0) continue;
    if (members.length === selection.members.length) {
      next.push(selection);
      continue;
    }
    if (members.length === 1) {
      const only = members[0]!;
      next.push({ type: "contact", key: only.key, name: only.name });
      continue;
    }
    next.push({ ...selection, members });
  }

  return next;
}
