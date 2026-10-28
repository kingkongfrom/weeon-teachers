"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, CheckCheck, Loader2, MessageCircle, Send, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ChatAvatar } from "@/components/comms/chat-avatar";
import { mergeChatMessages } from "@/lib/comms/chat-live-messages";
import {
  connectAdminTeacherChatLive,
  connectGuardianChatLive,
  type ChatLiveHandle,
} from "@/lib/comms/chat-realtime";
import { useLiveT } from "@/lib/i18n/client";
import type { RealtimeConfig } from "@/lib/supabase/browser";
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
  counterpartAvatarUrl = null,
  classLabel = "",
  studentName = "",
  initialMessages,
  otherReadAt = null,
  realtime,
  embedded = false,
}: {
  conversationId: string;
  channel?: ChatChannel;
  me: string;
  counterpartName: string;
  counterpartAvatarUrl?: string | null;
  classLabel?: string;
  studentName?: string;
  initialMessages: ChatMessageItem[];
  otherReadAt?: string | null;
  realtime: RealtimeConfig;
  /** When true, fills a split-pane workspace (no outer card chrome). */
  embedded?: boolean;
}) {
  const isAdminChat = channel === "admin";
  const t = useLiveT();
  const m = t.messages;
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessageItem[]>(initialMessages);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [otherTyping, setOtherTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const liveHandleRef = useRef<ChatLiveHandle | null>(null);
  const clearTypingRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSentRef = useRef(0);

  useEffect(() => {
    setMessages(initialMessages);
  }, [conversationId]);

  useEffect(() => {
    setMessages((previous) => mergeChatMessages(previous, initialMessages));
  }, [initialMessages]);

  useEffect(() => {
    if (isAdminChat) void markAdminTeacherChatRead(conversationId);
    else void markChatRead(conversationId);
  }, [conversationId, isAdminChat]);

  useEffect(() => {
    let active = true;
    let cleanup: (() => void) | null = null;
    const connect = isAdminChat ? connectAdminTeacherChatLive : connectGuardianChatLive;
    void (async () => {
      const connection = await connect(conversationId, realtime, {
        onMessage: (payload) => {
          const mine = payload.authorProfileId === me;
          const incoming: ChatMessageItem = {
            id: payload.id,
            body: payload.body,
            createdAt: payload.createdAt,
            mine,
            authorName: mine ? m.chatYou : counterpartName,
          };
          setMessages((prev) => mergeChatMessages(prev, [incoming]));
        },
        onTyping: () => {
          setOtherTyping(true);
          if (clearTypingRef.current) clearTimeout(clearTypingRef.current);
          clearTypingRef.current = setTimeout(() => setOtherTyping(false), 3500);
        },
        onDeleted: () => {
          router.push(COMMS_CHAT);
          router.refresh();
        },
      });
      if (!active) {
        await connection.cleanup();
        return;
      }
      liveHandleRef.current = connection.handle;
      cleanup = () => {
        liveHandleRef.current = null;
        connection.cleanup();
      };
    })();
    return () => {
      active = false;
      if (clearTypingRef.current) clearTimeout(clearTypingRef.current);
      cleanup?.();
    };
  }, [conversationId, isAdminChat, realtime, me, counterpartName, m.chatYou, router]);

  function notifyTyping() {
    const now = Date.now();
    if (now - lastSentRef.current < 1500) return;
    lastSentRef.current = now;
    liveHandleRef.current?.notifyTyping();
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
        const createdAt = new Date().toISOString();
        const outgoing: ChatMessageItem = {
          id,
          body: value,
          createdAt,
          mine: true,
          authorName: m.chatYou,
        };
        setMessages((prev) => mergeChatMessages(prev, [outgoing]));
        liveHandleRef.current?.broadcastMessage({
          id,
          body: value,
          createdAt,
          authorProfileId: me,
        });
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
    ? "wa-chat flex h-full min-h-0 flex-col overflow-hidden"
    : "wa-chat flex h-[min(512px,calc(100vh-13rem))] min-h-[288px] flex-col overflow-hidden rounded-2xl border border-[var(--wa-border)] shadow-[var(--wa-shadow)]";

  return (
    <div className={shellClass}>
      <div className="flex shrink-0 items-center gap-3 border-b border-[var(--wa-border)] bg-[var(--wa-header)] px-3 py-2.5">
        {embedded ? (
          <Link
            href="/comunicacion/chat"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--wa-icon)] hover:bg-[var(--wa-hover)] lg:hidden"
            aria-label={m.chatTitle}
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
        ) : null}
        <ChatAvatar
          name={counterpartName}
          imageUrl={counterpartAvatarUrl}
          className="h-10 w-10 text-sm"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[16px] font-semibold leading-tight text-[var(--wa-text)]">{counterpartName}</p>
          <p className="truncate text-[12.5px] leading-tight text-[var(--wa-muted)]">
            {isAdminChat ? m.chatAdminSubtitle : [classLabel, studentName].filter(Boolean).join(" · ")}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setDeleteOpen(true)}
          disabled={deleting}
          aria-label={m.chatDelete}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[var(--wa-icon)] transition-colors hover:bg-[var(--wa-hover)] hover:text-[var(--wa-error)] disabled:opacity-40"
        >
          <Trash2 className="h-[18px] w-[18px]" />
        </button>
      </div>

      <div className="chat-wallpaper flex min-h-0 flex-1 flex-col overflow-y-auto px-[4%] py-3">
        <div className="mt-auto flex flex-col">
          {messages.length === 0 ? (
            <div className="mx-auto flex max-w-[300px] flex-col items-center gap-3 rounded-2xl bg-[var(--wa-day)]/90 px-5 py-6 text-center shadow-sm backdrop-blur">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--wa-accent-soft)]">
                <MessageCircle className="h-6 w-6 text-[var(--wa-accent)]" aria-hidden />
              </span>
              <p className="text-[13px] leading-relaxed text-[var(--wa-day-ink)]">
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
                    <p className="mx-auto my-2.5 w-fit rounded-lg bg-[var(--wa-day)] px-3 py-1 text-[12.5px] font-medium text-[var(--wa-day-ink)] shadow-sm">
                      {dayLabel(message.createdAt, m.chatToday, m.chatYesterday)}
                    </p>
                  ) : null}
                  <div
                    className={cn(
                      "flex px-1",
                      message.mine ? "justify-end" : "justify-start",
                      startGroup ? "mt-2" : "mt-[3px]",
                      endGroup ? "mb-1" : "mb-0",
                    )}
                  >
                    <div
                      className={cn(
                        "wa-bubble relative max-w-[min(78%,34rem)] px-2.5 py-1.5 text-[14.5px] leading-[20px] text-[var(--wa-bubble)] shadow-[var(--wa-bubble-shadow)]",
                        message.mine ? "bg-[var(--wa-out)]" : "bg-[var(--wa-in)]",
                        "rounded-lg",
                        message.mine
                          ? endGroup
                            ? "rounded-br-[3px] wa-bubble-tail-out"
                            : ""
                          : endGroup
                            ? "rounded-bl-[3px] wa-bubble-tail-in"
                            : "",
                      )}
                    >
                      <p className="whitespace-pre-wrap break-words">
                        {message.body}
                        <span className="ml-2.5 inline-flex translate-y-1 items-center gap-1 align-bottom text-[11px] text-[var(--wa-time)]">
                          {timeLabel(message.createdAt)}
                          {message.mine ? (
                            otherReadAt &&
                            new Date(message.createdAt).getTime() <= new Date(otherReadAt).getTime() ? (
                              <CheckCheck className="h-[15px] w-[15px] text-[var(--wa-check)]" aria-hidden />
                            ) : (
                              <Check className="h-[15px] w-[15px] text-[var(--wa-check)]" aria-hidden />
                            )
                          ) : null}
                        </span>
                      </p>
                    </div>
                  </div>
                </Fragment>
              );
            })
          )}
          {otherTyping ? (
            <div className="mb-1 mt-2 flex justify-start px-1">
              <div
                className="flex items-center gap-1 rounded-lg rounded-bl-[3px] bg-[var(--wa-in)] px-3 py-2.5 shadow-[var(--wa-bubble-shadow)]"
                aria-label={m.chatTyping}
              >
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--wa-muted)]" />
                <span
                  className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--wa-muted)]"
                  style={{ animationDelay: "150ms" }}
                />
                <span
                  className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--wa-muted)]"
                  style={{ animationDelay: "300ms" }}
                />
              </div>
            </div>
          ) : null}
          <div ref={bottomRef} />
        </div>
      </div>

      {error ? (
        <p className="shrink-0 bg-[var(--wa-composer)] px-4 py-2 text-xs font-medium text-[var(--wa-error)]">
          {error}
        </p>
      ) : null}

      <div className="flex shrink-0 items-end gap-2 border-t border-[var(--wa-border)] bg-[var(--wa-composer)] px-3 py-2.5">
        <div className="flex min-w-0 flex-1 items-end rounded-3xl bg-[var(--wa-input)] px-4 py-2 shadow-sm">
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
            className="max-h-28 min-h-6 flex-1 resize-none bg-transparent text-[15px] leading-6 text-[var(--wa-text)] outline-none placeholder:text-[var(--wa-muted)]"
          />
        </div>
        <button
          type="button"
          onClick={() => void send()}
          disabled={sending || text.trim().length === 0}
          aria-label={m.chatSend}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--wa-accent)] text-[var(--wa-accent-ink)] shadow-sm transition-all hover:brightness-105 active:scale-95 disabled:cursor-not-allowed disabled:bg-[var(--wa-search)] disabled:text-[var(--wa-muted)] disabled:shadow-none"
        >
          {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
        </button>
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
