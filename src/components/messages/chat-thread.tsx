"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowUp, Loader2, MessageCircle, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { GuardianChatIdentity } from "@/components/messages/guardian-chat-identity";
import { TONE_AVATAR } from "@/lib/dashboard/tones";
import { mergeChatMessages } from "@/lib/comms/chat-live-messages";
import {
  connectAdminTeacherChatLive,
  connectGuardianChatLive,
  type ChatLiveHandle,
} from "@/lib/comms/chat-realtime";
import { guardianInitial } from "@/lib/messages/chat-display";
import { useT } from "@/lib/i18n/client";
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
  const t = useT();
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
        connection.cleanup();
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
