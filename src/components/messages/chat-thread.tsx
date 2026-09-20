"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowUp, Loader2, MessageCircle, Trash2 } from "lucide-react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { cn } from "@/lib/utils";
import { GuardianChatIdentity } from "@/components/messages/guardian-chat-identity";
import { TONE_AVATAR } from "@/lib/dashboard/tones";
import { guardianInitial } from "@/lib/messages/chat-display";
import { useT } from "@/lib/i18n/client";
import {
  bindRealtimeAuthRefresh,
  getAuthedRealtimeClient,
  type RealtimeConfig,
} from "@/lib/supabase/browser";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { COMMS_CHAT } from "@/lib/comms/paths";
import {
  deleteChatConversation,
  markChatRead,
  sendChatMessage,
} from "@/lib/teachers/chat-actions";
import {
  deleteAdminTeacherChat,
  markAdminTeacherChatRead,
  sendAdminTeacherChatMessage,
} from "@/lib/teachers/admin-teacher-chat-actions";
import type { ChatChannel, ChatMessageItem } from "@/lib/messages/chat-model";

function dayKey(iso: string): string {
  const date = new Date(iso);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function timeLabel(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("es-CR", { hour: "2-digit", minute: "2-digit" });
}

function dayLabel(iso: string, today: string, yesterday: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const now = new Date();
  if (dayKey(iso) === dayKey(now.toISOString())) return today;
  const prior = new Date(now);
  prior.setDate(now.getDate() - 1);
  if (dayKey(iso) === dayKey(prior.toISOString())) return yesterday;
  return date.toLocaleDateString("es-CR", { day: "numeric", month: "long" });
}

/** Same side and close in time → one visual run (like iMessage). */
function sameGroup(previous: ChatMessageItem | undefined, message: ChatMessageItem): boolean {
  if (!previous || previous.mine !== message.mine) return false;
  const gap = new Date(message.createdAt).getTime() - new Date(previous.createdAt).getTime();
  return Math.abs(gap) < 4 * 60 * 1000;
}

/** iMessage-style 1:1 thread with grouped bubbles and a pinned composer. */
export function ChatThread({
  conversationId,
  channel = "guardian",
  me,
  counterpartName,
  classLabel = "",
  studentName = "",
  initialMessages,
  realtime,
  embedded = false,
}: {
  conversationId: string;
  channel?: ChatChannel;
  me: string;
  counterpartName: string;
  classLabel?: string;
  studentName?: string;
  initialMessages: ChatMessageItem[];
  realtime: RealtimeConfig;
  /** When true, fills a split-pane workspace (no outer card chrome). */
  embedded?: boolean;
}) {
  const isAdminChat = channel === "admin";
  const messageTable = isAdminChat ? "admin_teacher_chat_messages" : "chat_messages";
  const conversationTable = isAdminChat
    ? "admin_teacher_chat_conversations"
    : "chat_conversations";
  const t = useT();
  const m = t.messages;
  const router = useRouter();
  const { url: realtimeUrl, anonKey: realtimeAnonKey } = realtime;
  const [messages, setMessages] = useState<ChatMessageItem[]>(initialMessages);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [otherTyping, setOtherTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const typingChannelRef = useRef<RealtimeChannel | null>(null);
  const clearTypingRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSentRef = useRef(0);

  useEffect(() => {
    setMessages(initialMessages);
  }, [conversationId, initialMessages]);

  useEffect(() => {
    if (isAdminChat) void markAdminTeacherChatRead(conversationId);
    else void markChatRead(conversationId);
  }, [conversationId, isAdminChat]);

  useEffect(() => {
    let active = true;
    let cleanupChannel: (() => void) | null = null;
    let unbindAuth: (() => void) | null = null;
    void (async () => {
      const supabase = await getAuthedRealtimeClient({ url: realtimeUrl, anonKey: realtimeAnonKey });
      if (!active) return;
      unbindAuth = bindRealtimeAuthRefresh(supabase);
      const channel = supabase
        .channel(`${messageTable}:${conversationId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: messageTable,
            filter: `conversation_id=eq.${conversationId}`,
          },
          (payload: { new: Record<string, unknown> }) => {
            const row = payload.new as {
              id?: string;
              body?: string;
              author_profile_id?: string | null;
              created_at?: string;
            };
            if (!row.id || typeof row.body !== "string") return;
            const mine = row.author_profile_id === me;
            setMessages((prev) =>
              prev.some((item) => item.id === row.id)
                ? prev
                : [
                    ...prev,
                    {
                      id: row.id as string,
                      body: row.body as string,
                      createdAt: row.created_at ?? new Date().toISOString(),
                      mine,
                      authorName: mine ? m.chatYou : counterpartName,
                    },
                  ],
            );
          },
        )
        .subscribe();
      cleanupChannel = () => {
        void supabase.removeChannel(channel);
      };
    })();
    return () => {
      active = false;
      unbindAuth?.();
      cleanupChannel?.();
    };
  }, [conversationId, messageTable, realtimeUrl, realtimeAnonKey, me, counterpartName, m.chatYou]);

  useEffect(() => {
    let active = true;
    let cleanupChannel: (() => void) | null = null;
    let unbindAuth: (() => void) | null = null;
    void (async () => {
      const supabase = await getAuthedRealtimeClient({ url: realtimeUrl, anonKey: realtimeAnonKey });
      if (!active) return;
      unbindAuth = bindRealtimeAuthRefresh(supabase);
      const channel = supabase
        .channel(`${conversationTable}:delete:${conversationId}`)
        .on(
          "postgres_changes",
          {
            event: "DELETE",
            schema: "public",
            table: conversationTable,
            filter: `id=eq.${conversationId}`,
          },
          () => {
            router.push(COMMS_CHAT);
            router.refresh();
          },
        )
        .subscribe();
      cleanupChannel = () => {
        void supabase.removeChannel(channel);
      };
    })();
    return () => {
      active = false;
      unbindAuth?.();
      cleanupChannel?.();
    };
  }, [conversationId, conversationTable, realtimeUrl, realtimeAnonKey, router]);

  useEffect(() => {
    let active = true;
    let cleanupChannel: (() => void) | null = null;
    let unbindAuth: (() => void) | null = null;
    void (async () => {
      const supabase = await getAuthedRealtimeClient({ url: realtimeUrl, anonKey: realtimeAnonKey });
      if (!active) return;
      unbindAuth = bindRealtimeAuthRefresh(supabase);
      const channel = supabase
        .channel(`chat-typing:${conversationId}`, { config: { broadcast: { self: false } } })
        .on("broadcast", { event: "typing" }, () => {
          setOtherTyping(true);
          if (clearTypingRef.current) clearTimeout(clearTypingRef.current);
          clearTypingRef.current = setTimeout(() => setOtherTyping(false), 3500);
        })
        .subscribe();
      typingChannelRef.current = channel;
      cleanupChannel = () => {
        typingChannelRef.current = null;
        void supabase.removeChannel(channel);
      };
    })();
    return () => {
      active = false;
      if (clearTypingRef.current) clearTimeout(clearTypingRef.current);
      unbindAuth?.();
      cleanupChannel?.();
    };
  }, [conversationId, realtimeUrl, realtimeAnonKey]);

  function notifyTyping() {
    const now = Date.now();
    if (now - lastSentRef.current < 1500) return;
    lastSentRef.current = now;
    typingChannelRef.current?.send({ type: "broadcast", event: "typing", payload: { at: now } });
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [messages.length, otherTyping]);

  async function send() {
    const value = text.trim();
    if (!value || sending) return;
    setSending(true);
    setError(null);
    try {
      const res = isAdminChat
        ? await sendAdminTeacherChatMessage(conversationId, value)
        : await sendChatMessage(conversationId, value);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setText("");
      if (res.messageId) {
        const id = res.messageId;
        setMessages((prev) =>
          prev.some((item) => item.id === id)
            ? prev
            : [
                ...prev,
                {
                  id,
                  body: value,
                  createdAt: new Date().toISOString(),
                  mine: true,
                  authorName: m.chatYou,
                },
              ],
        );
      }
    } catch {
      setError(m.chatLoadError);
    } finally {
      setSending(false);
    }
  }

  async function confirmDelete() {
    setDeleting(true);
    setError(null);
    try {
      const res = isAdminChat
        ? await deleteAdminTeacherChat(conversationId)
        : await deleteChatConversation(conversationId);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setDeleteOpen(false);
      router.push(COMMS_CHAT);
      router.refresh();
    } catch {
      setError(m.chatDeleteError);
    } finally {
      setDeleting(false);
    }
  }

  const shellClass = embedded
    ? "flex h-full min-h-0 flex-col overflow-hidden bg-surface"
    : "flex h-[min(512px,calc(100vh-13rem))] min-h-[288px] flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-sm";

  return (
    <div className={shellClass}>
      <div className="flex shrink-0 items-center gap-2 border-b border-border px-3 py-2">
        {embedded ? (
          <Link
            href="/comunicacion/chat"
            className="ui-hover inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-foreground/60 lg:hidden"
            aria-label={m.chatTitle}
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
        ) : null}
        <span
          className={cn(
            "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white",
            isAdminChat ? TONE_AVATAR.blue : TONE_AVATAR.green,
          )}
        >
          {guardianInitial(counterpartName)}
        </span>
        {isAdminChat ? (
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">{counterpartName}</p>
            <p className="truncate text-[11px] font-medium text-foreground/45">{m.chatAdminSubtitle}</p>
          </div>
        ) : (
          <GuardianChatIdentity
            name={counterpartName}
            classLabel={classLabel}
            studentName={studentName}
            variant="header"
            className="min-w-0 flex-1"
          />
        )}
        <button
          type="button"
          onClick={() => setDeleteOpen(true)}
          disabled={deleting}
          aria-label={m.chatDelete}
          className="ui-hover inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-foreground/45 hover:text-error disabled:opacity-40"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3 py-2">
        <div className="mt-auto flex flex-col">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center gap-1.5 px-3 pb-3 pt-1 text-center">
              <MessageCircle className="h-6 w-6 text-foreground/15" aria-hidden />
              <p className="max-w-[240px] text-xs font-medium leading-relaxed text-foreground/45">
                {m.chatThreadEmptyHint}
              </p>
            </div>
          ) : (
            messages.map((message, index) => {
              const previous = messages[index - 1];
              const next = messages[index + 1];
              const showDay =
                !previous || dayKey(previous.createdAt) !== dayKey(message.createdAt);
              const startGroup = showDay || !sameGroup(previous, message);
              const endGroup =
                !next ||
                !sameGroup(message, next) ||
                dayKey(next.createdAt) !== dayKey(message.createdAt);

              return (
                <Fragment key={message.id}>
                  {showDay ? (
                    <p className="py-1.5 text-center text-[11px] font-semibold text-foreground/40">
                      {dayLabel(message.createdAt, m.chatToday, m.chatYesterday)}
                    </p>
                  ) : null}
                  <div
                    className={cn(
                      "flex",
                      message.mine ? "justify-end" : "justify-start",
                      startGroup ? "mt-1.5" : "mt-0.5",
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[82%] px-2.5 py-1.5 text-sm shadow-sm",
                        message.mine
                          ? "brand-gradient text-white"
                          : "border border-border/60 bg-surface-muted text-foreground",
                        "rounded-2xl",
                        message.mine
                          ? cn(!startGroup && "rounded-tr-md", !endGroup && "rounded-br-md")
                          : cn(!startGroup && "rounded-tl-md", !endGroup && "rounded-bl-md"),
                      )}
                    >
                      <p className="whitespace-pre-wrap break-words">{message.body}</p>
                    </div>
                  </div>
                  {endGroup ? (
                    <p
                      className={cn(
                        "mt-0.5 px-1 text-[10px] font-medium text-foreground/40",
                        message.mine ? "text-right" : "text-left",
                      )}
                    >
                      {timeLabel(message.createdAt)}
                    </p>
                  ) : null}
                </Fragment>
              );
            })
          )}
          {otherTyping ? (
            <div className="mt-1 flex justify-start">
              <div
                className="flex items-center gap-1 rounded-2xl border border-border/60 bg-surface-muted px-3 py-2.5"
                aria-label={m.chatTyping}
              >
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-foreground/40" />
                <span
                  className="h-1.5 w-1.5 animate-bounce rounded-full bg-foreground/40"
                  style={{ animationDelay: "150ms" }}
                />
                <span
                  className="h-1.5 w-1.5 animate-bounce rounded-full bg-foreground/40"
                  style={{ animationDelay: "300ms" }}
                />
              </div>
            </div>
          ) : null}
          <div ref={bottomRef} />
        </div>
      </div>

      {error ? (
        <p className="shrink-0 border-t border-border px-3 py-2 text-xs font-medium text-error">
          {error}
        </p>
      ) : null}

      <div className="shrink-0 border-t border-border p-2">
        <div className="flex items-end gap-1.5 rounded-2xl border border-border bg-background px-2 py-0.5">
          <textarea
            value={text}
            onChange={(event) => {
              setText(event.target.value);
              notifyTyping();
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void send();
              }
            }}
            rows={1}
            maxLength={4000}
            placeholder={m.chatPlaceholder}
            className="max-h-24 min-h-7 flex-1 resize-none bg-transparent py-1 text-sm text-foreground outline-none placeholder:text-foreground/40"
          />
          <button
            type="button"
            onClick={() => void send()}
            disabled={sending || text.trim().length === 0}
            aria-label={m.chatSend}
            className="brand-gradient mb-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white transition-all hover:brightness-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowUp className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        title={m.chatDeleteConfirm}
        confirmLabel={t.gradebook.confirmYes}
        cancelLabel={t.common.cancel}
        pending={deleting}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleteOpen(false)}
      />
    </div>
  );
}
