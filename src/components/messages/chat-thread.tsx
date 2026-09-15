"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { ArrowUp, Loader2 } from "lucide-react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/client";
import { getAuthedRealtimeClient, type RealtimeConfig } from "@/lib/supabase/browser";
import { markChatRead, sendChatMessage } from "@/lib/teachers/chat-actions";
import type { ChatMessageItem } from "@/lib/messages/chat-model";

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
  me,
  counterpartName,
  initialMessages,
  realtime,
}: {
  conversationId: string;
  me: string;
  counterpartName: string;
  initialMessages: ChatMessageItem[];
  realtime: RealtimeConfig;
}) {
  const t = useT();
  const m = t.messages;
  const { url: realtimeUrl, anonKey: realtimeAnonKey } = realtime;
  const [messages, setMessages] = useState<ChatMessageItem[]>(initialMessages);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [otherTyping, setOtherTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const typingChannelRef = useRef<RealtimeChannel | null>(null);
  const clearTypingRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSentRef = useRef(0);

  useEffect(() => {
    void markChatRead(conversationId);
  }, [conversationId]);

  useEffect(() => {
    let active = true;
    let cleanup: (() => void) | null = null;
    void (async () => {
      const supabase = await getAuthedRealtimeClient({ url: realtimeUrl, anonKey: realtimeAnonKey });
      if (!active) return;
      const channel = supabase
        .channel(`chat:${conversationId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "chat_messages",
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
      cleanup = () => {
        void supabase.removeChannel(channel);
      };
    })();
    return () => {
      active = false;
      cleanup?.();
    };
  }, [conversationId, realtimeUrl, realtimeAnonKey, me, counterpartName, m.chatYou]);

  // Typing presence over Realtime Broadcast (ephemeral, nothing stored).
  useEffect(() => {
    let active = true;
    let cleanup: (() => void) | null = null;
    void (async () => {
      const supabase = await getAuthedRealtimeClient({ url: realtimeUrl, anonKey: realtimeAnonKey });
      if (!active) return;
      const channel = supabase
        .channel(`chat-typing:${conversationId}`, { config: { broadcast: { self: false } } })
        .on("broadcast", { event: "typing" }, () => {
          setOtherTyping(true);
          if (clearTypingRef.current) clearTimeout(clearTypingRef.current);
          clearTypingRef.current = setTimeout(() => setOtherTyping(false), 3500);
        })
        .subscribe();
      typingChannelRef.current = channel;
      cleanup = () => {
        typingChannelRef.current = null;
        void supabase.removeChannel(channel);
      };
    })();
    return () => {
      active = false;
      if (clearTypingRef.current) clearTimeout(clearTypingRef.current);
      cleanup?.();
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
      const res = await sendChatMessage(conversationId, value);
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

  return (
    <div className="flex h-[calc(100vh-13rem)] min-h-[440px] flex-col overflow-hidden rounded-2xl border border-border bg-surface">
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <span className="brand-gradient inline-flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white">
          {counterpartName.slice(0, 1).toUpperCase()}
        </span>
        <p className="text-sm font-bold text-foreground">{counterpartName}</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <p className="py-10 text-center text-sm font-medium text-foreground/40">
            {m.chatEmptyBody}
          </p>
        ) : (
          messages.map((message, index) => {
            const previous = messages[index - 1];
            const next = messages[index + 1];
            const showDay =
              !previous || dayKey(previous.createdAt) !== dayKey(message.createdAt);
            const startGroup = showDay || !sameGroup(previous, message);
            const endGroup =
              !next || !sameGroup(message, next) || dayKey(next.createdAt) !== dayKey(message.createdAt);

            return (
              <Fragment key={message.id}>
                {showDay ? (
                  <p className="py-3 text-center text-xs font-semibold text-foreground/40">
                    {dayLabel(message.createdAt, m.chatToday, m.chatYesterday)}
                  </p>
                ) : null}
                <div
                  className={cn(
                    "flex",
                    message.mine ? "justify-end" : "justify-start",
                    startGroup ? "mt-2" : "mt-0.5",
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[78%] px-3.5 py-2 text-sm shadow-sm",
                      message.mine
                        ? "brand-gradient text-white"
                        : "bg-surface-muted text-foreground",
                      "rounded-3xl",
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
              className="flex items-center gap-1 rounded-3xl bg-surface-muted px-3.5 py-3"
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

      {error ? (
        <p className="border-t border-border px-4 py-2 text-xs font-medium text-error">{error}</p>
      ) : null}

      <div className="border-t border-border p-3">
        <div className="flex items-end gap-2 rounded-3xl border border-border bg-background px-3 py-1.5">
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
            className="max-h-32 min-h-9 flex-1 resize-none bg-transparent py-1.5 text-sm text-foreground outline-none placeholder:text-foreground/40"
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
    </div>
  );
}
