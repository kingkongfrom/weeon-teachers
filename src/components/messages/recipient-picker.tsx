"use client";

import { useMemo, useState } from "react";
import { Check, Search } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/client";
import type { MessageContact } from "@/lib/dashboard/messages";

/** Modal recipient picker: search the teacher's parents and confirm a set. */
export function RecipientPicker({
  open,
  contacts,
  selected,
  onConfirm,
  onClose,
}: {
  open: boolean;
  contacts: MessageContact[];
  selected: string[];
  onConfirm: (profileIds: string[]) => void;
  onClose: () => void;
}) {
  const t = useT();

  return (
    <Dialog open={open} title={t.messages.addRecipient} onClose={onClose}>
      {open ? (
        <PickerBody
          key="open"
          contacts={contacts}
          selected={selected}
          onConfirm={onConfirm}
          onClose={onClose}
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
}: {
  contacts: MessageContact[];
  selected: string[];
  onConfirm: (profileIds: string[]) => void;
  onClose: () => void;
}) {
  const t = useT();
  const m = t.messages;
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState<string[]>(selected);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return contacts;
    return contacts.filter(
      (contact) =>
        contact.name.toLowerCase().includes(term) || contact.context.toLowerCase().includes(term),
    );
  }, [contacts, query]);

  function toggle(profileId: string) {
    setDraft((current) =>
      current.includes(profileId)
        ? current.filter((id) => id !== profileId)
        : [...current, profileId],
    );
  }

  return (
    <div className="flex flex-col gap-3">
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

      <ul className="max-h-72 overflow-y-auto rounded-xl border border-border">
        {filtered.length === 0 ? (
          <li className="px-3 py-6 text-center text-sm font-medium text-foreground/45">
            {m.empty}
          </li>
        ) : (
          filtered.map((contact) => {
            const active = draft.includes(contact.profileId);
            return (
              <li key={contact.profileId}>
                <button
                  type="button"
                  onClick={() => toggle(contact.profileId)}
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
                    <span className="block truncate text-sm font-semibold text-foreground">
                      {contact.name}
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
        className="inline-flex h-11 items-center justify-center rounded-xl brand-gradient px-4 text-sm font-semibold text-white transition-all hover:brightness-105 active:scale-[0.98]"
      >
        {m.confirmSelection}
      </button>
    </div>
  );
}
