"use client";

import { useMemo, useRef, useState } from "react";
import type { PickerSelection } from "@/components/comms/recipient-picker-modal";
import { ParaRecipientInlineList } from "@/components/comms/para-recipient-inline-list";
import { removeParaRecipientKey } from "@/lib/comms/compose-recipient-display";
import {
  addContactSelection,
  resolveTypedRecipientToken,
  searchMessageContacts,
} from "@/lib/comms/compose-recipient-search";
import type { MessageContact } from "@/lib/dashboard/messages";
import type { RealtimeConfig } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";
import { useLiveT } from "@/lib/i18n/use-i18n";

export function ComposeParaRecipientField({
  contacts,
  selections,
  onChange,
  onOpenPicker,
  realtime = null,
  disabled = false,
}: {
  contacts: MessageContact[];
  selections: PickerSelection[];
  onChange: (next: PickerSelection[]) => void;
  onOpenPicker: () => void;
  realtime?: RealtimeConfig | null;
  disabled?: boolean;
}) {
  const t = useLiveT();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const suggestions = useMemo(
    () => searchMessageContacts(contacts, query, 8),
    [contacts, query],
  );

  function commitContact(contact: MessageContact) {
    setError(null);
    onChange(addContactSelection(selections, contact));
    setQuery("");
    setOpen(false);
    inputRef.current?.focus();
  }

  function commitTypedToken() {
    const token = query.trim();
    if (!token) return;
    const resolved = resolveTypedRecipientToken(contacts, token);
    if (!resolved) {
      setError(t("comms.recipientNotFound"));
      return;
    }
    commitContact(resolved);
  }

  function onPickSuggestion(contact: MessageContact) {
    commitContact(contact);
  }

  return (
    <div className="relative min-w-0 flex-1">
      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
        <ParaRecipientInlineList
          selections={selections}
          onShowAll={onOpenPicker}
          onRemoveKey={(key) => onChange(removeParaRecipientKey(selections, key))}
          realtime={realtime}
          className="flex-none"
        />
        <input
          ref={inputRef}
          type="text"
          value={query}
          disabled={disabled}
          placeholder={
            selections.length === 0 ? t("comms.recipientInputPlaceholder") : undefined
          }
          className="min-w-[8rem] flex-1 border-0 bg-transparent py-1 text-sm text-foreground outline-none"
          onChange={(event) => {
            setError(null);
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            window.setTimeout(() => setOpen(false), 150);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === "," || event.key === "Tab") {
              if (query.trim()) {
                event.preventDefault();
                if (open && suggestions[0] && event.key === "Enter") {
                  onPickSuggestion(suggestions[0]);
                  return;
                }
                commitTypedToken();
              }
            }
            if (event.key === "Escape") {
              setOpen(false);
              setQuery("");
            }
          }}
        />
      </div>

      {error ? <p className="mt-1 text-xs font-medium text-error">{error}</p> : null}

      {open && query.trim() && suggestions.length > 0 ? (
        <ul
          className="absolute left-0 right-0 top-full z-30 mt-1 max-h-52 overflow-y-auto rounded-lg border border-border/80 bg-surface py-1 shadow-lg"
          role="listbox"
        >
          {suggestions.map((contact) => (
            <li key={`${contact.key}:${contact.context}`}>
              <button
                type="button"
                className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left hover:bg-surface-muted"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => onPickSuggestion(contact)}
              >
                <span className="text-sm font-medium text-foreground">{contact.name}</span>
                <span className="text-xs text-foreground/50">
                  {[contact.email, contact.context].filter(Boolean).join(" · ")}
                </span>
              </button>
            </li>
          ))}
          <li className="border-t border-border/60">
            <button
              type="button"
              className={cn(
                "w-full px-3 py-2 text-left text-xs font-semibold text-foreground/55 hover:bg-surface-muted hover:text-foreground",
              )}
              onMouseDown={(event) => event.preventDefault()}
              onClick={onOpenPicker}
            >
              {t("comms.browseAllRecipients")}
            </button>
          </li>
        </ul>
      ) : null}
    </div>
  );
}
