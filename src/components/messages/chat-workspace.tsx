"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, MessageCircle, MessageSquarePlus, Search, X } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { ChatAvatar } from "@/components/comms/chat-avatar";
import { useLiveLocale, useLiveT } from "@/lib/i18n/client";
import { useLiveT as useCommsT } from "@/lib/i18n/use-i18n";
import {
  bindRealtimeAuthRefresh,
  getAuthedRealtimeClient,
  type RealtimeConfig,
} from "@/lib/supabase/browser";
import { startTeacherAdminChat } from "@/lib/teachers/admin-teacher-chat-actions";
import { startChatConversation } from "@/lib/teachers/chat-actions";
import { COMMS_CHAT } from "@/lib/comms/paths";
import { ChatThread } from "@/components/messages/chat-thread";
import type {
  ChatContact,
  ChatConversationDetail,
  ChatConversationSummary,
} from "@/lib/messages/chat-model";

const ADMIN_CHAT_KEY = "__admin__";

function listTime(iso: string, yesterdayLabel: string, locale: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const tag = locale === "en" ? "en-US" : "es-CR";
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString(tag, { hour: "2-digit", minute: "2-digit" });
  }
  const prior = new Date(now);
  prior.setDate(now.getDate() - 1);
  if (date.toDateString() === prior.toDateString()) return yesterdayLabel;
  return date.toLocaleDateString(tag, { day: "numeric", month: "short" });
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
  const t = useLiveT();
  const comms = useCommsT();
  const m = t.messages;
  const locale = useLiveLocale();
  const router = useRouter();
  const { url: realtimeUrl, anonKey: realtimeAnonKey } = realtime;
  const [pickerOpen, setPickerOpen] = useState(false);
  const [listQuery, setListQuery] = useState("");
  const [listFilter, setListFilter] = useState<"all" | "unread">("all");
  const [adminStartError, setAdminStartError] = useState<string | null>(null);

  async function openAdminChat() {
    setAdminStartError(null);
    try {
      const res = await startTeacherAdminChat();
      if (!res.ok || !res.conversationId) {
        setAdminStartError(res.ok ? m.chatAdminStartError : res.error);
        return;
      }
      router.push(`${COMMS_CHAT}/${res.conversationId}`);
      router.refresh();
    } catch {
      setAdminStartError(m.chatAdminStartError);
    }
  }

  const unreadCount = useMemo(
    () => conversations.filter((row) => row.unread).length,
    [conversations],
  );

  const filteredConversations = useMemo(() => {
    const term = listQuery.trim().toLowerCase();
    return conversations.filter((row) => {
      if (listFilter === "unread" && !row.unread) return false;
      if (!term) return true;
      return (
        row.counterpartName.toLowerCase().includes(term) ||
        row.classLabel.toLowerCase().includes(term) ||
        row.studentName.toLowerCase().includes(term) ||
        (row.channel === "admin" && m.chatAdminSubtitle.toLowerCase().includes(term))
      );
    });
  }, [conversations, listFilter, listQuery, m.chatAdminSubtitle]);

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let cleanupChannel: (() => void) | null = null;
    let unbindAuth: (() => void) | null = null;
    void (async () => {
      const supabase = await getAuthedRealtimeClient({ url: realtimeUrl, anonKey: realtimeAnonKey });
      if (!active) return;
      unbindAuth = bindRealtimeAuthRefresh(supabase);
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
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "admin_teacher_chat_messages" },
          () => {
            if (timer) clearTimeout(timer);
            timer = setTimeout(() => router.refresh(), 800);
          },
        )
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "admin_teacher_chat_conversations" },
          () => {
            if (timer) clearTimeout(timer);
            timer = setTimeout(() => router.refresh(), 800);
          },
        )
        .on(
          "postgres_changes",
          { event: "DELETE", schema: "public", table: "chat_conversations" },
          () => {
            if (timer) clearTimeout(timer);
            timer = setTimeout(() => router.refresh(), 300);
          },
        )
        .on(
          "postgres_changes",
          { event: "DELETE", schema: "public", table: "admin_teacher_chat_conversations" },
          () => {
            if (timer) clearTimeout(timer);
            timer = setTimeout(() => router.refresh(), 300);
          },
        )
        .subscribe();
      cleanupChannel = () => {
        void supabase.removeChannel(channel);
      };
    })();
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
      unbindAuth?.();
      cleanupChannel?.();
    };
  }, [realtimeUrl, realtimeAnonKey, router]);

  const showThread = Boolean(selectedId && selectedDetail);
  const showListOnMobile = !showThread;

  return (
    <>
      <div className="wa-chat relative flex h-full min-h-0 flex-col overflow-hidden bg-[var(--wa-panel)] md:border md:border-[var(--wa-border)] md:shadow-[var(--wa-shadow)]">
        <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(320px,412px)_minmax(0,1fr)]">
          <aside
            className={cn(
              "flex h-full min-h-0 flex-col border-[var(--wa-border)] bg-[var(--wa-header)]",
              showListOnMobile ? "flex" : "hidden lg:flex lg:border-r",
            )}
          >
            <div className="shrink-0 px-4 pb-3 pt-4 sm:px-5 md:px-4">
              <div className="flex items-center gap-2">
              <label className="flex min-w-0 flex-1 items-center gap-2.5 rounded-full border border-transparent bg-[var(--wa-search)] px-3.5 py-2.5 transition-colors focus-within:border-[var(--wa-ring)] focus-within:ring-2 focus-within:ring-[var(--wa-ring-soft)]">
                <Search className="h-[17px] w-[17px] shrink-0 text-[var(--wa-muted)]" />
                <input
                  value={listQuery}
                  onChange={(event) => setListQuery(event.target.value)}
                  placeholder={m.chatSearchOrStart ?? m.chatSearchPlaceholder}
                  className="h-5 w-full bg-transparent text-[14px] text-[var(--wa-text)] outline-none placeholder:text-[var(--wa-muted)]"
                />
                {listQuery ? (
                  <button
                    type="button"
                    onClick={() => setListQuery("")}
                    className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[var(--wa-muted)] hover:text-[var(--wa-text)]"
                    aria-label={comms("common.cancel")}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </label>
              {/* With a conversation open the floating button would sit over the
                  composer, so the action lives here instead. */}
              {selectedId ? (
                <button
                  type="button"
                  onClick={() => setPickerOpen(true)}
                  aria-label={m.chatNew}
                  title={m.chatNew}
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0891B2] text-white transition-colors hover:bg-[#0e7490]"
                >
                  <MessageSquarePlus className="h-[18px] w-[18px]" aria-hidden />
                </button>
              ) : null}
              </div>

              <div className="mt-3 flex gap-2">
                {(["all", "unread"] as const).map((filter) => {
                  const active = listFilter === filter;
                  const count = filter === "unread" ? unreadCount : conversations.length;
                  return (
                    <button
                      key={filter}
                      type="button"
                      onClick={() => setListFilter(filter)}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition-all",
                        active
                          ? "bg-[var(--wa-accent)] text-[var(--wa-accent-ink)] shadow-sm"
                          : "border border-[var(--wa-chip-line)] bg-[var(--wa-chip)] text-[var(--wa-text)] hover:bg-[var(--wa-hover)]",
                      )}
                    >
                      {filter === "all" ? m.chatFilterAll : m.chatFilterUnread}
                      <span
                        className={cn(
                          "text-[11px] font-bold",
                          active ? "opacity-80" : "text-[var(--wa-muted)]",
                        )}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {adminStartError ? (
                <p className="mt-2 px-1 text-[11px] font-medium text-error">{adminStartError}</p>
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
                <ul className="flex flex-col gap-0.5">
                  {filteredConversations.map((conversation) => {
                    const active = conversation.id === selectedId;
                    return (
                      <li key={conversation.id}>
                        <Link
                          href={`/comunicacion/chat/${conversation.id}`}
                          className={cn(
                            "flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors",
                            active ? "bg-[var(--wa-active)]" : "hover:bg-[var(--wa-hover)]",
                          )}
                        >
                          <ChatAvatar
                            name={conversation.counterpartName}
                            imageUrl={conversation.avatarUrl}
                            schoolLogoUrl={conversation.schoolLogoUrl}
                            className="h-[49px] w-[49px] text-[18px]"
                          />
                          <span className="flex min-w-0 flex-1 flex-col gap-1">
                            <span className="flex items-baseline gap-2">
                              <span
                                className={cn(
                                  "min-w-0 flex-1 truncate text-[16px] text-[var(--wa-text)]",
                                  conversation.unread ? "font-semibold" : "font-normal",
                                )}
                              >
                                {conversation.counterpartName}
                              </span>
                              <span
                                className={cn(
                                  "shrink-0 text-[12px]",
                                  conversation.unread
                                    ? "font-semibold text-[var(--wa-accent)]"
                                    : "text-[var(--wa-muted)]",
                                )}
                              >
                                {listTime(conversation.lastAt, m.chatYesterday, locale)}
                              </span>
                            </span>
                            <span className="flex items-center gap-2">
                              <span className="shrink-0 rounded-md bg-[var(--wa-search)] px-1.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide text-[var(--wa-muted)]">
                                {conversation.kind === "student" && conversation.classLabel
                                  ? `${m.chatRoleStudent} ${conversation.classLabel}`
                                  : conversation.kind === "student"
                                    ? m.chatRoleStudent
                                    : conversation.kind === "parent"
                                      ? m.chatRoleParent
                                      : conversation.kind === "teacher"
                                        ? m.chatRoleTeacher
                                        : m.chatAdminSubtitle}
                              </span>
                            </span>
                          </span>
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
              "flex h-full min-h-0 min-w-0 flex-col",
              showThread ? "flex" : "hidden lg:flex",
            )}
          >
            {showThread && selectedDetail ? (
              <ChatThread
                embedded
                conversationId={selectedDetail.id}
                channel={selectedDetail.channel}
                me={me}
                counterpartName={selectedDetail.counterpartName}
                counterpartAvatarUrl={selectedDetail.avatarUrl}
                counterpartSchoolLogoUrl={selectedDetail.schoolLogoUrl}
                classLabel={selectedDetail.classLabel}
                studentName={selectedDetail.studentName}
                initialMessages={selectedDetail.messages}
                otherReadAt={selectedDetail.otherReadAt}
                realtime={realtime}
              />
            ) : (
              <div className="chat-wallpaper flex h-full flex-1 flex-col items-center justify-center gap-4 px-8 py-10 text-center">
                <span className="flex h-24 w-24 items-center justify-center rounded-full bg-[var(--wa-search)] shadow-inner">
                  <MessageCircle className="h-11 w-11 text-[var(--wa-muted)]" strokeWidth={1.25} aria-hidden />
                </span>
                <div className="max-w-md space-y-2">
                  <p className="text-sm text-[var(--wa-muted)]">{m.chatSelectPrompt}</p>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Floating only on the empty state: with a conversation open it would
          sit over the composer, so the list header carries a compact button. */}
      {selectedId ? null : (
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          aria-label={m.chatNew}
          className="fixed bottom-[calc(4.25rem+env(safe-area-inset-bottom,0px)+1rem)] right-4 z-40 inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#0891B2] text-white shadow-lg transition-all hover:bg-[#0e7490] active:scale-95 lg:bottom-8 lg:right-8"
        >
          <MessageSquarePlus className="h-6 w-6" aria-hidden />
        </button>
      )}

      <ChatPicker
        open={pickerOpen}
        contacts={[
          {
            key: ADMIN_CHAT_KEY,
            name: m.chatAdminSubtitle,
            context: "",
            studentName: "",
            kind: "admin",
          },
          ...contacts,
        ]}
        onClose={() => setPickerOpen(false)}
        onPick={async (contact) => {
          if (contact.key === ADMIN_CHAT_KEY) {
            setPickerOpen(false);
            await openAdminChat();
            return;
          }
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
  const m = useLiveT().messages;
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
  const m = useLiveT().messages;
  const [query, setQuery] = useState("");
  const [kindFilter, setKindFilter] = useState<"all" | NonNullable<ChatContact["kind"]>>("all");
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  // A conversation is identified by the account, so the picker shows one row
  // per person even when the directory lists them once per class/child.
  const uniqueContacts = useMemo(() => {
    // The directory can hold several roster accounts for what is visibly one
    // person (the same guardian imported per child, sometimes with a slightly
    // different surname). Surface one row per person + class + child, keeping
    // the first account, so the picker never shows the same face twice.
    const seen = new Set<string>();
    const signature = (contact: ChatContact) => {
      const name = contact.name.toLowerCase().replace(/\s+/g, " ").trim();
      // Same person if one name contains the other ("Fernanda Acosta" vs
      // "Fernanda Acosta Martinez"); first+last is enough to avoid merging
      // different people who share a surname.
      const parts = name.split(" ").filter(Boolean);
      const short = parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1]}` : name;
      return [
        contact.kind ?? "",
        short,
        contact.context.toLowerCase(),
        contact.studentName.toLowerCase(),
      ].join("::");
    };
    const kept: ChatContact[] = [];
    for (const contact of contacts) {
      const full = signature(contact);
      if (seen.has(full)) continue;
      // Also match a previously kept row whose name is a prefix of this one.
      const name = contact.name.toLowerCase().replace(/\s+/g, " ").trim();
      const clash = kept.some((other) => {
        if ((other.kind ?? "") !== (contact.kind ?? "")) return false;
        if (other.context.toLowerCase() !== contact.context.toLowerCase()) return false;
        if (other.studentName.toLowerCase() !== contact.studentName.toLowerCase()) return false;
        const otherName = other.name.toLowerCase().replace(/\s+/g, " ").trim();
        return name.startsWith(otherName) || otherName.startsWith(name);
      });
      if (clash) continue;
      seen.add(full);
      kept.push(contact);
    }
    return kept;
  }, [contacts]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return uniqueContacts.filter((contact) => {
      if (kindFilter !== "all" && contact.kind !== kindFilter) return false;
      if (!term) return true;
      return (
        contact.name.toLowerCase().includes(term) ||
        contact.context.toLowerCase().includes(term) ||
        contact.studentName.toLowerCase().includes(term)
      );
    });
  }, [uniqueContacts, query, kindFilter]);

  const groups = useMemo(() => {
    const byKind = new Map<NonNullable<ChatContact["kind"]>, ChatContact[]>();
    for (const contact of filtered) {
      const kind = contact.kind ?? "parent";
      const list = byKind.get(kind) ?? [];
      list.push(contact);
      byKind.set(kind, list);
    }
    const order: NonNullable<ChatContact["kind"]>[] = ["admin", "parent", "student"];
    return order
      .map((kind) => ({ kind, items: byKind.get(kind) ?? [] }))
      .filter((group) => group.items.length > 0);
  }, [filtered]);

  function roleLabel(kind: ChatContact["kind"]) {
    if (kind === "admin") return m.chatRoleAdmin;
    if (kind === "teacher") return m.chatRoleTeacher;
    if (kind === "parent") return m.chatRoleParent;
    return m.chatRoleStudent;
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="flex items-center gap-2 rounded-full border border-border bg-background px-3.5 py-2.5">
        <Search className="h-4 w-4 shrink-0 text-foreground/40" />
        <input
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={m.chatSearchPlaceholder}
          className="h-6 w-full bg-transparent text-sm text-foreground outline-none"
        />
        {query ? (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-foreground/40 hover:text-foreground/70"
            aria-label="Limpiar"
          >
            <span className="text-[10px] font-bold">×</span>
          </button>
        ) : null}
      </label>

      <div className="flex flex-wrap gap-2">
        {([
          { key: "all", label: m.chatFilterAll },
          { key: "admin", label: m.chatRoleAdmin },
          { key: "parent", label: m.chatRoleParent },
          { key: "student", label: m.chatRoleStudent },
        ] as const).map((chip) => {
          const active = kindFilter === chip.key;
          // Counted from the de-duplicated list so the chips agree with rows.
          const count =
            chip.key === "all"
              ? uniqueContacts.length
              : uniqueContacts.filter((c) => c.kind === chip.key).length;
          return (
            <button
              key={chip.key}
              type="button"
              onClick={() => setKindFilter(chip.key)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                active
                  ? "bg-[var(--wa-accent)] text-[var(--wa-accent-ink)]"
                  : "border border-border bg-surface text-foreground/70 hover:bg-surface-muted",
              )}
            >
              {chip.label}
              <span className={cn("font-bold", active ? "opacity-80" : "text-foreground/45")}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="max-h-80 overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="px-1 py-6 text-center text-sm font-medium text-foreground/45">
            {m.chatPickerEmpty}
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {groups.map((group) => (
              <li key={group.kind}>
                <p className="sticky top-0 z-10 bg-surface px-2 py-1.5 text-xs font-bold uppercase tracking-wide text-foreground/55">
                  {roleLabel(group.kind)}
                  <span className="ml-1.5 font-medium text-foreground/40">{group.items.length}</span>
                </p>
                <ul>
                  {group.items.map((contact) => (
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
                        <ChatAvatar
                          name={contact.name}
                          imageUrl={contact.avatarUrl}
                          className="h-10 w-10 text-sm"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold text-foreground">
                            {contact.name}
                          </span>
                          <span className="block truncate text-xs font-medium text-foreground/45">
                            {[contact.context, contact.studentName].filter(Boolean).join(" Â· ")}
                          </span>
                        </span>
                        {pendingKey === contact.key ? (
                          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-foreground/40" />
                        ) : null}
                      </button>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
