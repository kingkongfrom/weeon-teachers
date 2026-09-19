"use client";

import { useMemo, useState } from "react";
import { Check, Search, User, Users } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { messagesTone } from "@/lib/comms/messages-tone";
import { hubFilterChipClass } from "@/lib/dashboard/hub-tones";
import { useT } from "@/lib/i18n/use-i18n";
import {
  buildBulkRecipientCatalog,
  filterBulkCatalog,
  type BulkRecipientCategory,
  type BulkRecipientItem,
} from "@/lib/comms/recipient-catalog";
import type { CommsGroupWithGrade } from "@/lib/comms/broadcast-filter";
import { contactRowId, dedupeMessageContacts } from "@/lib/dashboard/message-contacts";
import type { MessageContact } from "@/lib/dashboard/messages";

export type PickerSelection =
  | { type: "contact"; key: string; name: string }
  | { type: "bulk"; item: BulkRecipientItem };

export function RecipientPickerModal({
  open,
  contacts,
  groups,
  selected,
  onConfirm,
  onClose,
  mode: initialMode = "regular",
  allowBulk = true,
}: {
  open: boolean;
  contacts: MessageContact[];
  groups: CommsGroupWithGrade[];
  selected: PickerSelection[];
  onConfirm: (next: PickerSelection[]) => void;
  onClose: () => void;
  mode?: "regular" | "bulk";
  allowBulk?: boolean;
}) {
  const t = useT();

  return (
    <Dialog open={open} title={t("comms.selectRecipientsTitle")} onClose={onClose}>
      {open ? (
        <PickerBody
          key={`${initialMode}-${selected.length}`}
          contacts={contacts}
          groups={groups}
          selected={selected}
          onConfirm={onConfirm}
          onClose={onClose}
          initialMode={initialMode}
          allowBulk={allowBulk}
        />
      ) : null}
    </Dialog>
  );
}

function PickerBody({
  contacts,
  groups,
  selected,
  onConfirm,
  onClose,
  initialMode,
  allowBulk,
}: {
  contacts: MessageContact[];
  groups: CommsGroupWithGrade[];
  selected: PickerSelection[];
  onConfirm: (next: PickerSelection[]) => void;
  onClose: () => void;
  initialMode: "regular" | "bulk";
  allowBulk: boolean;
}) {
  const t = useT();
  const [mode, setMode] = useState<"regular" | "bulk">(initialMode);
  const [query, setQuery] = useState("");
  const [bulkCategory, setBulkCategory] = useState<"all" | BulkRecipientCategory>("all");
  const [draft, setDraft] = useState<PickerSelection[]>(selected);

  const bulkCatalog = useMemo(() => buildBulkRecipientCatalog(groups), [groups]);

  const filteredContacts = useMemo(() => {
    const unique = dedupeMessageContacts(contacts);
    const term = query.trim().toLowerCase();
    if (!term) return unique;
    return unique.filter(
      (contact) =>
        contact.name.toLowerCase().includes(term) ||
        contact.context.toLowerCase().includes(term) ||
        contact.kind.toLowerCase().includes(term),
    );
  }, [contacts, query]);

  const filteredBulk = useMemo(
    () => filterBulkCatalog(bulkCatalog, query, bulkCategory),
    [bulkCatalog, query, bulkCategory],
  );

  function toggleContact(contact: MessageContact) {
    setDraft((current) => {
      const exists = current.some((item) => item.type === "contact" && item.key === contact.key);
      if (exists) {
        return current.filter((item) => !(item.type === "contact" && item.key === contact.key));
      }
      return [...current.filter((item) => item.type !== "bulk"), { type: "contact", key: contact.key, name: contact.name }];
    });
  }

  function toggleBulk(item: BulkRecipientItem) {
    setDraft((current) => {
      const exists = current.some((row) => row.type === "bulk" && row.item.id === item.id);
      if (exists) {
        return current.filter((row) => !(row.type === "bulk" && row.item.id === item.id));
      }
      return [...current.filter((row) => row.type !== "contact"), { type: "bulk", item }];
    });
  }

  const bulkSections = useMemo(() => {
    const sections: Array<{ title: string; items: BulkRecipientItem[] }> = [];
    const byCategory: Record<BulkRecipientCategory, BulkRecipientItem[]> = {
      sections: [],
      sectors: [],
      staff: [],
    };
    for (const item of filteredBulk) {
      byCategory[item.category].push(item);
    }
    if (byCategory.sections.length > 0) {
      sections.push({ title: t("comms.bulkSections"), items: byCategory.sections });
    }
    if (byCategory.sectors.length > 0) {
      sections.push({ title: t("comms.bulkSectors"), items: byCategory.sectors });
    }
    if (byCategory.staff.length > 0) {
      sections.push({ title: t("comms.bulkStaff"), items: byCategory.staff });
    }
    return sections;
  }, [filteredBulk, t]);

  return (
    <div className="flex flex-col gap-4">
      {allowBulk ? (
        <div className="inline-flex w-fit rounded-full border border-border bg-surface-muted/50 p-1">
          <button
            type="button"
            onClick={() => setMode("regular")}
            className={cn(
              "inline-flex h-9 items-center gap-2 rounded-full px-4 text-sm font-semibold transition-colors",
              mode === "regular"
                ? "bg-surface text-foreground shadow-sm"
                : "text-foreground/55 hover:text-foreground",
            )}
          >
            <User className="h-4 w-4" />
            {t("comms.pickerRegular")}
          </button>
          <button
            type="button"
            onClick={() => setMode("bulk")}
            className={cn(
              "inline-flex h-9 items-center gap-2 rounded-full px-4 text-sm font-semibold transition-colors",
              mode === "bulk"
                ? "bg-surface text-foreground shadow-sm"
                : "text-foreground/55 hover:text-foreground",
            )}
          >
            <Users className="h-4 w-4" />
            {t("comms.pickerBulk")}
          </button>
        </div>
      ) : null}

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/35" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("comms.pickerSearchPlaceholder")}
          autoFocus
          className="h-11 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-sm text-foreground outline-none transition-colors focus:border-brand-400 focus:ring-2 focus:ring-brand-500/25"
        />
      </div>

      {mode === "bulk" ? (
        <div className="flex flex-wrap gap-2">
          {(
            [
              { id: "all", label: t("comms.filterAll") },
              { id: "sections", label: t("comms.bulkSections") },
              { id: "sectors", label: t("comms.bulkSectors") },
              { id: "staff", label: t("comms.bulkStaff") },
            ] as const
          ).map((chip) => (
            <button
              key={chip.id}
              type="button"
              onClick={() => setBulkCategory(chip.id)}
              className={cn(
                "h-8 rounded-full px-3 text-xs font-semibold transition-colors",
                hubFilterChipClass("green", bulkCategory === chip.id),
              )}
            >
              {chip.label}
            </button>
          ))}
        </div>
      ) : null}

      <ul className="max-h-80 overflow-y-auto rounded-xl border border-border">
        {mode === "regular" ? (
          filteredContacts.length === 0 ? (
            <li className="px-3 py-8 text-center text-sm font-medium text-foreground/45">
              {t("comms.noContacts")}
            </li>
          ) : (
            filteredContacts.map((contact) => {
              const active = draft.some(
                (item) => item.type === "contact" && item.key === contact.key,
              );
              return (
                <li key={contactRowId(contact)}>
                  <button
                    type="button"
                    onClick={() => toggleContact(contact)}
                    className="flex w-full items-center gap-3 border-b border-border/60 px-3 py-3 text-left transition-colors last:border-b-0 hover:bg-surface-muted/60"
                  >
                    <span
                      className={cn(
                        "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border",
                        active
                          ? messagesTone.selectedChip
                          : "border-border text-transparent",
                      )}
                    >
                      <Check className="h-3.5 w-3.5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="truncate text-sm font-semibold text-foreground">
                          {contact.name}
                        </span>
                        <KindBadge kind={contact.kind} />
                      </span>
                      {contact.context ? (
                        <span className="mt-0.5 block truncate text-xs font-medium text-foreground/45">
                          {contact.context}
                        </span>
                      ) : null}
                    </span>
                  </button>
                </li>
              );
            })
          )
        ) : bulkSections.length === 0 ? (
          <li className="px-3 py-8 text-center text-sm font-medium text-foreground/45">
            {t("comms.noContacts")}
          </li>
        ) : (
          bulkSections.flatMap((section) => [
            <li
              key={`heading-${section.title}`}
              className="bg-surface-muted/40 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-foreground/45"
            >
              {section.title}
            </li>,
            ...section.items.map((item) => {
              const active = draft.some(
                (row) => row.type === "bulk" && row.item.id === item.id,
              );
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => toggleBulk(item)}
                    className="flex w-full items-center gap-3 border-b border-border/60 px-3 py-3 text-left transition-colors last:border-b-0 hover:bg-surface-muted/60"
                  >
                    <span
                      className={cn(
                        "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border",
                        active
                          ? messagesTone.selectedChip
                          : "border-border text-transparent",
                      )}
                    >
                      <Check className="h-3.5 w-3.5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="truncate text-sm font-semibold text-foreground">
                          {item.label}
                        </span>
                        <KindBadge kind={item.kind === "parents" ? "parent" : item.kind === "students" ? "student" : "teacher"} />
                      </span>
                    </span>
                  </button>
                </li>
              );
            }),
          ])
        )}
      </ul>

      <button
        type="button"
        onClick={() => {
          onConfirm(draft);
          onClose();
        }}
        className={cn(
          "inline-flex h-11 items-center justify-center rounded-xl px-4 text-sm font-semibold active:scale-[0.98]",
          messagesTone.primaryButton,
        )}
      >
        {t("comms.confirmSelection")}
      </button>
    </div>
  );
}

function KindBadge({ kind }: { kind: string }) {
  const t = useT();
  const label =
    kind === "student"
      ? t("comms.kindStudent")
      : kind === "teacher"
        ? t("comms.kindTeacher")
        : t("comms.kindParent");
  const tone =
    kind === "student"
      ? "bg-emerald-100 text-emerald-800"
      : kind === "teacher"
        ? "bg-violet-100 text-violet-800"
        : "bg-amber-100 text-amber-900";

  return (
    <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase", tone)}>
      {label}
    </span>
  );
}
