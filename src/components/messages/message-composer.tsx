"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dropdown } from "@/components/ui/dropdown";
import { Switch } from "@/components/ui/switch";
import { RichTextEditor } from "@/components/assessments/rich-text";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/client";
import { docToPlainText, emptyDoc, type RichTextDoc } from "@/lib/assessments/model";
import { createMessageThread } from "@/lib/teachers/message-actions";
import type { MessageContact } from "@/lib/dashboard/messages";

type GroupOption = { id: string; name: string };

/** Compose an email-style message: people or a group, subject, rich body. */
export function MessageComposer({
  contacts,
  groups,
}: {
  contacts: MessageContact[];
  groups: GroupOption[];
}) {
  const t = useT();
  const m = t.messages;
  const router = useRouter();

  const [audience, setAudience] = useState<"individual" | "group">("individual");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [classId, setClassId] = useState(groups[0]?.id ?? "");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState<RichTextDoc>(() => emptyDoc());
  const [allowReplies, setAllowReplies] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return contacts;
    return contacts.filter(
      (contact) =>
        contact.name.toLowerCase().includes(term) || contact.context.toLowerCase().includes(term),
    );
  }, [contacts, query]);

  const hasBody = docToPlainText(body).trim().length > 0;
  const canSend = hasBody && (audience === "group" ? classId.length > 0 : selected.length > 0);

  function toggle(profileId: string) {
    setSelected((current) =>
      current.includes(profileId)
        ? current.filter((id) => id !== profileId)
        : [...current, profileId],
    );
  }

  async function send() {
    if (!canSend || sending) return;
    setSending(true);
    setError(null);
    const res = await createMessageThread({
      subject,
      body,
      audience,
      classId: audience === "group" ? classId : null,
      recipientProfileIds: audience === "group" ? [] : selected,
      allowReplies,
    });
    setSending(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    router.push(`/comunicacion/${res.threadId}`);
  }

  const inputClass =
    "h-10 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-brand-400 focus:ring-2 focus:ring-brand-500/25";

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5">
      <div className="flex flex-wrap items-center gap-2">
        {(
          [
            { id: "individual", label: m.audienceIndividual },
            { id: "group", label: m.audienceGroup },
          ] as const
        ).map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => setAudience(option.id)}
            className={cn(
              "h-9 rounded-full px-3.5 text-sm font-semibold transition-colors",
              audience === option.id
                ? "bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300"
                : "text-foreground/60 hover:bg-surface-muted",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      {audience === "group" ? (
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-foreground/60">{m.pickGroup}</span>
          {groups.length > 0 ? (
            <Dropdown
              value={classId}
              onChange={setClassId}
              options={groups.map((group) => ({ value: group.id, label: group.name }))}
              ariaLabel={m.pickGroup}
            />
          ) : (
            <p className="text-sm font-medium text-foreground/50">{m.emptyBody}</p>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-foreground/60">{m.pickPeople}</span>
            {selected.length > 0 ? (
              <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[11px] font-semibold text-foreground/60">
                {m.selectedCount(selected.length)}
              </span>
            ) : null}
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/35" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={m.pickPeople}
              className={cn(inputClass, "pl-9")}
            />
          </div>
          <ul className="max-h-56 overflow-y-auto rounded-xl border border-border">
            {filtered.length === 0 ? (
              <li className="px-3 py-4 text-center text-sm font-medium text-foreground/45">
                {m.empty}
              </li>
            ) : (
              filtered.map((contact) => {
                const active = selected.includes(contact.profileId);
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
        </div>
      )}

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold text-foreground/60">{m.subject}</span>
        <input
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
          placeholder={m.subjectPlaceholder}
          maxLength={160}
          className={inputClass}
        />
      </label>

      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold text-foreground/60">{m.body}</span>
        <RichTextEditor value={body} onChange={setBody} placeholder={m.bodyPlaceholder} />
      </div>

      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-foreground/70">{m.allowReplies}</span>
        <Switch checked={allowReplies} onChange={setAllowReplies} label={m.allowReplies} />
      </div>

      {error ? (
        <p className="rounded-lg bg-error/10 px-3 py-2 text-sm font-medium text-error">{error}</p>
      ) : null}

      <div className="flex justify-end">
        <Button onClick={() => void send()} disabled={!canSend || sending}>
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {sending ? m.sending : m.send}
        </Button>
      </div>
    </div>
  );
}
