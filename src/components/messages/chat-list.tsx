"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Search } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/client";
import { getAuthedRealtimeClient, type RealtimeConfig } from "@/lib/supabase/browser";
import { startChatConversation } from "@/lib/teachers/chat-actions";
import type { ChatContact, ChatConversationSummary } from "@/lib/messages/chat-model";

function relativeTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const minutes = Math.round((Date.now() - date.getTime()) / 60000);
  if (Math.abs(minutes) < 60) return `${Math.max(1, minutes)} min`;
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return `${hours} h`;
  return `${Math.round(hours / 24)} d`;
}

/** Chat list + "Nuevo chat" picker. Live: refreshes when a message arrives. */
export function ChatList({
  conversations,
  contacts,
  realtime,
}: {
  conversations: ChatConversationSummary[];
  contacts: ChatContact[];
  realtime: RealtimeConfig;
}) {
  const t = useT();
  const m = t.messages;
  const router = useRouter();
  const { url: realtimeUrl, anonKey: realtimeAnonKey } = realtime;
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let cleanup: (() => void) | null = null;
    void (async () => {
      const supabase = await getAuthedRealtimeClient({ url: realtimeUrl, anonKey: realtimeAnonKey });
      if (!active) return;
      const channel = supabase
        .channel("chat-list")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "chat_messages" },
          () => {
            if (timer) clearTimeout(timer);
            timer = setTimeout(() => router.refresh(), 800);
          },
        )
        .on(
          // A guardian may start a conversation before sending anything, so
          // refresh on the conversation insert too.
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "chat_conversations" },
          () => {
            if (timer) clearTimeout(timer);
            timer = setTimeout(() => router.refresh(), 800);
          },
        )
        .subscribe();
      cleanup = () => {
        void supabase.removeChannel(channel);
      };
    })();
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
      cleanup?.();
    };
  }, [realtimeUrl, realtimeAnonKey, router]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="brand-gradient inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold text-white shadow-sm transition-all hover:brightness-105 active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" />
          {m.chatNew}
        </button>
      </div>

      {conversations.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border px-6 py-14 text-center">
          <p className="text-sm font-semibold text-foreground">{m.chatEmpty}</p>
          <p className="mx-auto mt-1 max-w-sm text-xs font-medium text-foreground/50">
            {m.chatEmptyBody}
          </p>
        </div>
      ) : (
        <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
          {conversations.map((conversation) => (
            <li key={conversation.id}>
              <Link
                href={`/comunicacion/chat/${conversation.id}`}
                className="ui-hover flex items-center gap-3 px-4 py-3.5"
              >
                <span className="brand-gradient inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white">
                  {conversation.counterpartName.slice(0, 1).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p
                      className={cn(
                        "truncate text-sm",
                        conversation.unread
                          ? "font-bold text-foreground"
                          : "font-semibold text-foreground/80",
                      )}
                    >
                      {conversation.counterpartName}
                    </p>
                    <span className="ml-auto shrink-0 text-xs font-medium text-foreground/40">
                      {relativeTime(conversation.lastAt)}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-sm text-foreground/55">
                    {conversation.lastBody || m.chatEmptyBody}
                  </p>
                </div>
                {conversation.unread ? (
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-brand-500" aria-hidden />
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}

      <ChatPicker
        open={pickerOpen}
        contacts={contacts}
        onClose={() => setPickerOpen(false)}
        onPick={async (contact) => {
          const res = await startChatConversation(contact.key, contact.name);
          if (res.ok) {
            setPickerOpen(false);
            router.push(`/comunicacion/chat/${res.conversationId}`);
          }
        }}
      />
    </div>
  );
}

function ChatPicker({
  open,
  contacts,
  onClose,
  onPick,
}: {
  open: boolean;
  contacts: ChatContact[];
  onClose: () => void;
  onPick: (contact: ChatContact) => Promise<void>;
}) {
  const m = useT().messages;
  return (
    <Dialog open={open} title={m.chatPickerTitle} onClose={onClose}>
      {open ? <ChatPickerBody contacts={contacts} onPick={onPick} /> : null}
    </Dialog>
  );
}

function ChatPickerBody({
  contacts,
  onPick,
}: {
  contacts: ChatContact[];
  onPick: (contact: ChatContact) => Promise<void>;
}) {
  const m = useT().messages;
  const [query, setQuery] = useState("");
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return contacts;
    return contacts.filter(
      (contact) =>
        contact.name.toLowerCase().includes(term) ||
        contact.context.toLowerCase().includes(term),
    );
  }, [contacts, query]);

  return (
    <div className="flex flex-col gap-3">
          <label className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2">
            <Search className="h-4 w-4 shrink-0 text-foreground/40" />
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={m.chatSearchPlaceholder}
              className="h-6 w-full bg-transparent text-sm text-foreground outline-none"
            />
          </label>

          <ul className="max-h-80 overflow-y-auto">
            {filtered.length === 0 ? (
              <li className="px-1 py-6 text-center text-sm font-medium text-foreground/45">
                {m.chatPickerEmpty}
              </li>
            ) : (
              filtered.map((contact) => (
                <li key={contact.key}>
                  <button
                    type="button"
                    disabled={pendingKey !== null}
                    onClick={async () => {
                      setPendingKey(contact.key);
                      try {
                        await onPick(contact);
                      } finally {
                        setPendingKey(null);
                      }
                    }}
                    className="ui-hover flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left"
                  >
                    <span className="brand-gradient inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white">
                      {contact.name.slice(0, 1).toUpperCase()}
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
                    {pendingKey === contact.key ? (
                      <Loader2 className="h-4 w-4 shrink-0 animate-spin text-foreground/40" />
                    ) : null}
                  </button>
                </li>
              ))
            )}
      </ul>
    </div>
  );
}
