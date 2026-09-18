"use client";

import { useMemo, useState } from "react";
import { Check, Search } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { hubFilterChipClass } from "@/lib/dashboard/tones";
import { useT } from "@/lib/i18n/client";
import { contactMatchesClass } from "@/lib/dashboard/message-contacts";
import type { MessageContact } from "@/lib/dashboard/messages";

export type RecipientKindFilter = "all" | "parent" | "student";

/** Modal recipient picker: search, kind filter, optional class scope. */
export function RecipientPicker({
  open,
  contacts,
  selected,
  onConfirm,
  onClose,
  kindFilter = "all",
  classId = null,
  groupName = null,
  title,
}: {
  open: boolean;
  contacts: MessageContact[];
  selected: string[];
  onConfirm: (profileIds: string[]) => void;
  onClose: () => void;
  kindFilter?: RecipientKindFilter;
  classId?: string | null;
  groupName?: string | null;
  title?: string;
}) {
  const t = useT();

  return (
    <Dialog open={open} title={title ?? t.messages.addRecipient} onClose={onClose}>
      {open ? (
        <PickerBody
          key={`${kindFilter}-${classId ?? "all"}-${groupName ?? ""}`}
          contacts={contacts}
          selected={selected}
          onConfirm={onConfirm}
          onClose={onClose}
          kindFilter={kindFilter}
          classId={classId}
          groupName={groupName}
        />
      ) : null}
    </Dialog>
  );
}

function PickerBody({
  contacts,
  selected,
  onConfirm,
  onClose,
  kindFilter,
  classId,
  groupName,
}: {
  contacts: MessageContact[];
  selected: string[];
  onConfirm: (profileIds: string[]) => void;
  onClose: () => void;
  kindFilter: RecipientKindFilter;
  classId: string | null;
  groupName: string | null;
}) {
  const t = useT();
  const m = t.messages;
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState<string[]>(selected);
  const [activeKind, setActiveKind] = useState<RecipientKindFilter>(kindFilter);

  const scoped = useMemo(() => {
    return contacts.filter((contact) => {
      if (classId && !contactMatchesClass(contact, classId, groupName ?? "")) return false;
      if (activeKind === "parent") return contact.kind === "parent";
      if (activeKind === "student") return contact.kind === "student";
      return true;
    });
  }, [contacts, classId, groupName, activeKind]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return scoped;
    return scoped.filter(
      (contact) =>
        contact.name.toLowerCase().includes(term) || contact.context.toLowerCase().includes(term),
    );
  }, [scoped, query]);

  function toggle(key: string) {
    setDraft((current) =>
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key],
    );
  }

  function selectAll() {
    setDraft(filtered.map((contact) => contact.key));
  }

  function clearAll() {
    setDraft([]);
  }

  const showKindTabs = kindFilter === "all" && !classId;

  return (
    <div className="flex flex-col gap-3">
      {showKindTabs ? (
        <div className="flex flex-wrap gap-2">
          {(
            [
              { id: "all", label: m.filterAll },
              { id: "parent", label: m.kindParent },
              { id: "student", label: m.kindStudent },
            ] as const
          ).map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setActiveKind(option.id)}
              className={cn(
                "h-8 rounded-full px-3 text-xs font-semibold transition-colors",
                hubFilterChipClass("purple", activeKind === option.id),
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : null}

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/35" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={m.pickPeople}
          autoFocus
          className="h-10 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-sm text-foreground outline-none transition-colors focus:border-brand-400 focus:ring-2 focus:ring-brand-500/25"
        />
      </div>

      <div className="flex items-center justify-between gap-2 px-1">
        <span className="text-xs font-medium text-foreground/50">
          {m.selectedCount(draft.length)} · {scoped.length} {m.availableContacts}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={selectAll}
            className="text-xs font-semibold text-brand-500 hover:underline"
          >
            {m.selectAll}
          </button>
          <button
            type="button"
            onClick={clearAll}
            className="text-xs font-semibold text-foreground/45 hover:underline"
          >
            {m.clearSelection}
          </button>
        </div>
      </div>

      <ul className="max-h-72 overflow-y-auto rounded-xl border border-border">
        {filtered.length === 0 ? (
          <li className="px-3 py-6 text-center text-sm font-medium text-foreground/45">
            {m.noContacts}
          </li>
        ) : (
          filtered.map((contact) => {
            const active = draft.includes(contact.key);
            return (
              <li key={contact.key}>
                <button
                  type="button"
                  onClick={() => toggle(contact.key)}
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-surface-muted/60"
                >
                  <span
                    className={cn(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border",
                      active
                        ? "border-brand-500 bg-brand-500 text-white"
                        : "border-border text-transparent",
                    )}
                  >
                    <Check className="h-3.5 w-3.5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-sm font-semibold text-foreground">
                        {contact.name}
                      </span>
                      {contact.kind ? (
                        <span className="shrink-0 rounded-full bg-surface-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-foreground/50">
                          {contact.kind === "student" ? m.kindStudent : m.kindParent}
                        </span>
                      ) : null}
                    </span>
                    {contact.context ? (
                      <span className="block truncate text-xs font-medium text-foreground/45">
                        {contact.context}
                      </span>
                    ) : null}
                  </span>
                </button>
              </li>
            );
          })
        )}
      </ul>

      <button
        type="button"
        onClick={() => {
          onConfirm(draft);
          onClose();
        }}
        className="brand-gradient inline-flex h-11 items-center justify-center rounded-xl px-4 text-sm font-semibold text-white shadow-sm transition-all hover:brightness-105 active:scale-[0.98]"
      >
        {m.confirmSelection}
      </button>
    </div>
  );
}
