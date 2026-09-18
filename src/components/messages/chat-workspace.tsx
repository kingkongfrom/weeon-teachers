"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, MessageCircle, Plus, Search } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/client";
import { getAuthedRealtimeClient, type RealtimeConfig } from "@/lib/supabase/browser";
import { startChatConversation } from "@/lib/teachers/chat-actions";
import { ChatThread } from "@/components/messages/chat-thread";
import { GuardianChatIdentity } from "@/components/messages/guardian-chat-identity";
import { TONE_AVATAR } from "@/lib/dashboard/tones";
import { guardianInitial } from "@/lib/messages/chat-display";
import type {
  ChatContact,
  ChatConversationDetail,
  ChatConversationSummary,
} from "@/lib/messages/chat-model";

function relativeTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const minutes = Math.round((Date.now() - date.getTime()) / 60000);
  if (Math.abs(minutes) < 60) return `${Math.max(1, minutes)} min`;
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return `${hours} h`;
  return `${Math.round(hours / 24)} d`;
}

function NewChatButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-xl text-sm font-semibold text-white shadow-sm transition-all hover:brightness-105 active:scale-[0.98]",
        TONE_AVATAR.green,
      )}
    >
      <Plus className="h-4 w-4" aria-hidden />
      {label}
    </button>
  );
}

/** Split chat workspace: conversation list + active thread (desktop) or one pane (mobile). */
export function ChatWorkspace({
  conversations,
  contacts,
  realtime,
  selectedId,
  selectedDetail,
  me,
}: {
  conversations: ChatConversationSummary[];
  contacts: ChatContact[];
  realtime: RealtimeConfig;
  selectedId: string | null;
  selectedDetail: ChatConversationDetail | null;
  me: string;
}) {
  const t = useT();
  const m = t.messages;
  const router = useRouter();
  const { url: realtimeUrl, anonKey: realtimeAnonKey } = realtime;
  const [pickerOpen, setPickerOpen] = useState(false);
  const [listQuery, setListQuery] = useState("");

  const filteredConversations = useMemo(() => {
    const term = listQuery.trim().toLowerCase();
    if (!term) return conversations;
    return conversations.filter(
      (row) =>
        row.counterpartName.toLowerCase().includes(term) ||
        row.classLabel.toLowerCase().includes(term) ||
        row.studentName.toLowerCase().includes(term),
    );
  }, [conversations, listQuery]);

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

  const showThread = Boolean(selectedId && selectedDetail);
  const showListOnMobile = !showThread;

  return (
    <>
      <div className="flex h-[min(576px,calc(100vh-12rem))] min-h-[304px] flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
        <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(240px,280px)_minmax(0,1fr)]">
          <aside
            className={cn(
              "flex min-h-0 flex-col border-b border-border lg:border-b-0 lg:border-r",
              showListOnMobile ? "flex" : "hidden lg:flex",
            )}
          >
            <div className="shrink-0 space-y-1.5 border-b border-border px-3 py-2">
              <NewChatButton label={m.chatNew} onClick={() => setPickerOpen(true)} />
              {conversations.length > 0 ? (
                <label className="flex items-center gap-1.5 rounded-xl border border-border bg-background px-2 py-1">
                  <Search className="h-3.5 w-3.5 shrink-0 text-foreground/40" />
                  <input
                    value={listQuery}
                    onChange={(event) => setListQuery(event.target.value)}
                    placeholder={m.chatSearchPlaceholder}
                    className="h-5 w-full bg-transparent text-xs text-foreground outline-none placeholder:text-foreground/40"
                  />
                </label>
              ) : null}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-1.5">
              {conversations.length === 0 ? (
                <div className="flex flex-col items-center gap-1.5 px-3 py-8 text-center">
                  <MessageCircle className="h-7 w-7 text-foreground/20" aria-hidden />
                  <p className="text-sm font-semibold text-foreground">{m.chatEmpty}</p>
                  <p className="text-xs font-medium text-foreground/50">{m.chatEmptyBody}</p>
                </div>
              ) : filteredConversations.length === 0 ? (
                <p className="px-2 py-6 text-center text-xs font-medium text-foreground/45">
                  {m.chatPickerEmpty}
                </p>
              ) : (
                <ul className="flex flex-col gap-1">
                  {filteredConversations.map((conversation) => {
                    const active = conversation.id === selectedId;
                    return (
                      <li key={conversation.id}>
                        <Link
                          href={`/comunicacion/chat/${conversation.id}`}
                          className={cn(
                            "ui-hover flex items-center gap-2 rounded-xl px-2 py-2 transition-colors",
                            active
                              ? "bg-surface-muted ring-1 ring-border"
                              : "hover:bg-surface-muted/50",
                          )}
                        >
                          <span
                            className={cn(
                              "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white",
                              TONE_AVATAR.green,
                            )}
                          >
                            {guardianInitial(conversation.counterpartName)}
                          </span>
                          <span className="min-w-0 flex-1">
                            <div className="flex items-start gap-2">
                              <GuardianChatIdentity
                                name={conversation.counterpartName}
                                classLabel={conversation.classLabel}
                                studentName={conversation.studentName}
                                variant="list"
                                className={cn(
                                  "flex-1",
                                  conversation.unread && "[&>span:first-child]:font-bold",
                                )}
                              />
                              <span className="shrink-0 pt-0.5 text-[10px] font-medium text-foreground/40">
                                {relativeTime(conversation.lastAt)}
                              </span>
                            </div>
                            {conversation.lastBody.trim() ? (
                              <span className="mt-0.5 block truncate text-[11px] font-medium text-foreground/40">
                                {conversation.lastBody}
                              </span>
                            ) : null}
                          </span>
                          {conversation.unread ? (
                            <span
                              className="h-2 w-2 shrink-0 rounded-full bg-[#0f766e] dark:bg-[#5eead4]"
                              aria-hidden
                            />
                          ) : null}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </aside>

          <section
            className={cn(
              "flex min-h-0 min-w-0 flex-col",
              showThread ? "flex" : "hidden lg:flex",
            )}
          >
            {showThread && selectedDetail ? (
              <ChatThread
                embedded
                conversationId={selectedDetail.id}
                me={me}
                counterpartName={selectedDetail.counterpartName}
                classLabel={selectedDetail.classLabel}
                studentName={selectedDetail.studentName}
                initialMessages={selectedDetail.messages}
                realtime={realtime}
              />
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 px-5 py-8 text-center">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-surface-muted">
                  <MessageCircle className="h-6 w-6 text-foreground/25" aria-hidden />
                </div>
                <div className="max-w-xs space-y-0.5">
                  <p className="text-sm font-semibold text-foreground">{m.chatTitle}</p>
                  <p className="text-xs font-medium text-foreground/50">{m.chatSelectPrompt}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setPickerOpen(true)}
                  className={cn(
                    "inline-flex h-8 items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold text-white shadow-sm transition-all hover:brightness-105 active:scale-[0.98]",
                    TONE_AVATAR.green,
                  )}
                >
                  <Plus className="h-4 w-4" aria-hidden />
                  {m.chatNew}
                </button>
              </div>
            )}
          </section>
        </div>
      </div>

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
    </>
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
        contact.context.toLowerCase().includes(term) ||
        contact.studentName.toLowerCase().includes(term),
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
                <span
                  className={cn(
                    "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white",
                    TONE_AVATAR.green,
                  )}
                >
                  {guardianInitial(contact.name)}
                </span>
                <GuardianChatIdentity
                  name={contact.name}
                  classLabel={contact.context}
                  studentName={contact.studentName}
                  variant="picker"
                  className="min-w-0 flex-1"
                />
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
