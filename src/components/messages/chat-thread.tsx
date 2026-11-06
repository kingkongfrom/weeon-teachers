"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, CheckCheck, Loader2, MessageCircle, Send, Smile, Trash2 } from "lucide-react";
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
import type {
  ChatChannel,
  ChatMessageItem,
  ChatMessageReaction,
  ChatMessageReply,
} from "@/lib/messages/chat-model";
import { ChatReplyQuote } from "@/components/messages/chat-reply-quote";
import { ChatReplyMenu } from "@/components/messages/chat-reply-menu";
import { ChatReactionBar } from "@/components/comms/chat-reaction-bar";
import { useReplyMenu } from "@/components/messages/use-reply-menu";
import { toggleTeacherChatReaction } from "@/lib/teachers/chat-reaction-actions";

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

/**
 * True when a message is nothing but emoji (docs/chat-reactions.md).
 *
 * `Extended_Pictographic` covers the pictographs; ZWJ (U+200D), the variation
 * selector (U+FE0F) and the skin-tone modifiers (U+1F3FB–U+1F3FF) are the pieces
 * that build one glyph from several codepoints -- 👨‍👩‍👧, ❤️, 👍🏽. Digits and `#`/`*`
 * are excluded even though they carry the Emoji property: "123" is a number.
 */
const EMOJI_ONLY_PATTERN =
  /^(?:\p{Extended_Pictographic}|\p{Emoji_Modifier}|\u200d|\ufe0f|\s)+$/u;

function isEmojiOnly(body: string): boolean {
  const trimmed = body.trim();
  if (!trimmed) return false;
  if (!/\p{Extended_Pictographic}/u.test(trimmed)) return false;
  return EMOJI_ONLY_PATTERN.test(trimmed);
}

/** iMessage-style 1:1 thread with grouped bubbles and a pinned composer. */
export function ChatThread({
  conversationId,
  channel = "guardian",
  me,
  counterpartName,
  counterpartAvatarUrl = null,
  counterpartSchoolLogoUrl = null,
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
  /** School logo, shown ahead of the photo for school leadership. */
  counterpartSchoolLogoUrl?: string | null;
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
  /** The message being answered, shown above the composer until sent. */
  const [replyTo, setReplyTo] = useState<ChatMessageReply | null>(null);
  /** Right-click / long-press menu: which bubble, and where to draw it. */
  const [menuFor, setMenuFor] = useState<ChatMessageItem | null>(null);
  /** The message the reaction bar is open for (docs/chat-reactions.md). */
  const [reactFor, setReactFor] = useState<ChatMessageItem | null>(null);
  const replyMenu = useReplyMenu(true);

  const bottomRef = useRef<HTMLDivElement | null>(null);
  /** The composer, so choosing "Responder" can put the caret straight in it. */
  const composerRef = useRef<HTMLTextAreaElement | null>(null);
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
              // A realtime INSERT carries no reactions; the next read fills them.
              reactions: [],
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

  /**
   * Registration for one bubble.
   *
   * The hook owns pointer handling through ONE document listener, so this only
   * hands it the element (via `ref`) and the reply fallback for right-click. No
   * per-render handler objects, no state writes during a drag — that is what kept
   * tearing the gesture down.
   *
   *   right-click (mouse) -> reply menu
   *   long press  (touch) -> reaction pill
   *   swipe left  (touch) -> reply menu
   */
  function bubbleHandlers(message: ChatMessageItem) {
    return replyMenu.bubbleProps(
      () => setMenuFor(message),
      () => setReactFor(message),
      message.id,
    );
  }

  /**
   * Apply a reaction, optimistically — same behaviour as the ERP.
   *
   * The pill updates before the server answers, and your PREVIOUS emoji is removed on
   * the same frame: the server keeps one row per (message, reactor) and replaces it,
   * but the local state only added the new emoji, so the old one lingered until the
   * next refetch.
   *
   * `mine` drives the toggle: tapping the emoji you already chose removes it.
   */
  async function applyReaction(message: ChatMessageItem, emoji: string) {
    setReactFor(null);
    replyMenu.close();

    const existing = message.reactions.find((r) => r.emoji === emoji);
    const removing = Boolean(existing?.mine);

    setMessages((prev) =>
      prev.map((row) => {
        if (row.id !== message.id) return row;

        const cleared = row.reactions
          .map((reaction) =>
            reaction.mine && reaction.names.length > 1
              ? {
                  ...reaction,
                  names: reaction.names.filter((name) => name !== me),
                  count: reaction.count - 1,
                  mine: false,
                }
              : reaction.mine
                ? null
                : reaction,
          )
          .filter((reaction): reaction is ChatMessageReaction => reaction !== null)
          .filter((reaction) => reaction.emoji !== emoji);

        if (removing) {
          return { ...row, reactions: cleared };
        }

        return {
          ...row,
          reactions: [
            ...cleared,
            {
              emoji,
              count: (existing?.count ?? 0) + 1,
              names: [...(existing?.names ?? []), me],
              mine: true,
            },
          ],
        };
      }),
    );

    const res = await toggleTeacherChatReaction(
      conversationId,
      message.id,
      emoji,
      removing,
      isAdminChat ? "admin" : "guardian",
    );
    if (!res.ok) setError(res.error);
  }
  async function send() {
    const value = text.trim();
    if (!value || sending) return;
    setSending(true);
    setError(null);
    try {
      const res = isAdminChat
        ? await sendAdminTeacherChatMessage(conversationId, value, replyTo?.id)
        : await sendChatMessage(conversationId, value, replyTo?.id);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setText("");
      setReplyTo(null);
      if (res.messageId) {
        const id = res.messageId;
        const createdAt = new Date().toISOString();
        /*
         * The optimistic row is what the SENDER sees until a refetch. It must
         * carry the quote, or a reply looks like a plain message to the person
         * who wrote it while the recipient sees the quote.
         */
        const outgoing: ChatMessageItem = {
          id,
          body: value,
          createdAt,
          mine: true,
          authorName: m.chatYou,
          replyTo: replyTo ?? undefined,
          reactions: [],
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
      <div className="flex min-h-[4.5rem] shrink-0 items-center gap-3 border-b border-[var(--wa-border)] bg-[var(--wa-header)] px-3 pb-3 pt-4">
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
          schoolLogoUrl={counterpartSchoolLogoUrl}
          className="h-9 w-9 self-center text-sm"
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

      {/*
        `touch-action: pan-y` reserves the HORIZONTAL axis for us.
        Without it the browser claims a horizontal drag for overscroll /
        history-back and cancels the pointer stream mid-gesture: the bubble moved
        (so the swipe looked alive) but no pointerup ever arrived to commit the
        reply. Vertical panning and scrolling are untouched.
      */}
      <div
        className="chat-wallpaper flex min-h-0 flex-1 flex-col overflow-y-auto px-[4%] py-3 [touch-action:pan-y]"
        style={{ overscrollBehaviorX: "contain" }}
      >
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
              /*
               * Emoji-only messages get NO bubble: the glyphs are the message, and a
               * coloured pillow behind them is noise. Anything containing a letter,
               * digit or punctuation is text and keeps its bubble.
               */
              const emojiOnly = isEmojiOnly(message.body);

              return (
                <Fragment key={message.id}>
                  {showDay ? (
                    <p className="mx-auto my-2.5 w-fit rounded-lg bg-[var(--wa-day)] px-3 py-1 text-[12.5px] font-medium text-[var(--wa-day-ink)] shadow-sm">
                      {dayLabel(message.createdAt, m.chatToday, m.chatYesterday)}
                    </p>
                  ) : null}
                  <div
                    className={cn(
                      "group/row flex items-end gap-1 px-1",
                      message.mine ? "justify-end" : "justify-start",
                      startGroup ? "mt-2" : "mt-[3px]",
                      endGroup ? "mb-1" : "mb-0",
                    )}
                  >
                    {/*
                     * Hover reveals the smile; clicking it opens the six emojis.
                     * On the INNER side, so it never sits over the bubble edge.
                     *
                     * TOUCH DEVICES GET NO SMILE BUTTON. It is revealed by
                     * `group-hover`, and a finger cannot hover — so on a phone it
                     * stayed at opacity 0 while remaining a live, invisible tap
                     * target sitting beside the bubble. Reactions on touch are
                     * reached by long-pressing the bubble itself (see
                     * use-reply-menu.ts), which is the gesture a phone user
                     * expects. Hiding it outright removes the dead target instead
                     * of merely making it invisible.
                     */}
                    {message.mine ? (
                      <button
                        type="button"
                        aria-label={m.chatReply}
                        onClick={(event) => {
                          const rect = event.currentTarget.getBoundingClientRect();
                          replyMenu.openAt(rect.left, rect.top);
                          setReactFor(message);
                          setMenuFor(null);
                        }}
                        className="order-first inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[var(--wa-muted)] opacity-0 transition-opacity hover:bg-[var(--wa-hover)] focus-visible:opacity-100 group-hover/row:opacity-100 pointer-coarse:hidden"
                      >
                        <Smile className="h-[18px] w-[18px]" aria-hidden />
                      </button>
                    ) : null}
                    <div
                      {...bubbleHandlers(message)}
                      className={cn(
                        "wa-bubble relative max-w-[min(78%,34rem)] px-2.5 py-1.5 text-[14.5px] leading-[20px] text-[var(--wa-bubble)]",
                        // No native long-press callout: it appeared on top of our menu.
                        "select-none [-webkit-touch-callout:none]",
                        // Emoji-only: no surface, no shadow, no tail.
                        emojiOnly
                          ? "bg-transparent shadow-none"
                          : cn(
                              "shadow-[var(--wa-bubble-shadow)]",
                              message.mine ? "bg-[var(--wa-out)]" : "bg-[var(--wa-in)]",
                            ),
                        "rounded-lg",
                        emojiOnly
                          ? ""
                          : message.mine
                            ? endGroup
                              ? "rounded-br-[3px] wa-bubble-tail-out"
                              : ""
                            : endGroup
                              ? "rounded-bl-[3px] wa-bubble-tail-in"
                              : "",
                      )}
                      /*
                       * No inline transform here. The swipe writes
                       * `el.style.transform` directly from the document listener,
                       * so React never re-renders during a drag and can never
                       * interrupt one. The element springs back on its own.
                       */
                    >
                      {message.replyTo ? (
                        <div className="mb-1">
                          <ChatReplyQuote reply={message.replyTo} compact />
                        </div>
                      ) : null}
                      <p
                        className={cn(
                          "whitespace-pre-wrap break-words",
                          // Emoji-only: the glyphs are the message, so they carry the
                          // space a line of text would -- 50% larger than body text.
                          emojiOnly ? "text-[22px] leading-[28px]" : null,
                        )}
                      >
                        {/*
                         * Written flush against the body: `whitespace-pre-wrap` keeps
                         * the newline and indentation a JSX line break would add, which
                         * showed as a blank line above the time.
                         */}
                        {message.body}<span
                          className={cn(
                            "items-center gap-1 whitespace-nowrap text-[11px] text-[var(--wa-time)]",
                            /*
                             * Emoji-only: the time drops UNDER the glyphs. `flex` is
                             * block-level, so it breaks the line; inline beside a bare
                             * emoji reads as part of the message.
                             */
                            emojiOnly
                              ? "mt-0.5 flex"
                              : "ml-2.5 inline-flex translate-y-1 align-bottom",
                          )}
                        >
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
                      {/*
                       * Reactions: pill half on, half off the bubble's bottom edge,
                       * the way WhatsApp stacks them. Absolute, so the bubble's size
                       * and the text layout are untouched.
                       */}
                      {message.reactions.length > 0 ? (
                        <div className="absolute right-[18px] bottom-0 z-10 flex flex-wrap gap-1 translate-y-1/2">
                          {message.reactions.map((reaction) => (
                            <button
                              key={reaction.emoji}
                              type="button"
                              onClick={() => void applyReaction(message, reaction.emoji)}
                              title={reaction.names.join(", ")}
                              aria-label={`${reaction.emoji} ${reaction.count} - ${reaction.names.join(", ")}`}
                              className={cn(
                                "relative inline-flex h-[23px] w-[23px] items-center justify-center",
                                "rounded-full bg-[var(--wa-panel)]/50 ring-2 ring-[var(--wa-border)]",
                                reaction.mine ? "font-bold" : "font-semibold",
                              )}
                            >
                              <span className="text-[17px] leading-none">{reaction.emoji}</span>
                              {/* A count of one says nothing the emoji does not. */}
                              {reaction.count > 1 ? (
                                <span className="absolute bottom-0 right-[3px] text-[10px] font-bold leading-none text-[var(--wa-muted)]">
                                  {reaction.count}
                                </span>
                              ) : null}
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                    {/* Touch: no smile button. See the note on the own-message one above. */}
                    {message.mine ? null : (
                      <button
                        type="button"
                        aria-label={m.chatReply}
                        onClick={(event) => {
                          const rect = event.currentTarget.getBoundingClientRect();
                          replyMenu.openAt(rect.left, rect.top);
                          setReactFor(message);
                          setMenuFor(null);
                        }}
                        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[var(--wa-muted)] opacity-0 transition-opacity hover:bg-[var(--wa-hover)] focus-visible:opacity-100 group-hover/row:opacity-100 pointer-coarse:hidden"
                      >
                        <Smile className="h-[18px] w-[18px]" aria-hidden />
                      </button>
                    )}
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

      {reactFor && replyMenu.position ? (
        <ChatReactionBar
          position={replyMenu.position}
          label={m.chatReply}
          onPick={(emoji) => void applyReaction(reactFor, emoji)}
          onClose={() => setReactFor(null)}
        />
      ) : null}

      {replyTo ? (
        <div className="shrink-0 border-t border-[var(--wa-border)] bg-[var(--wa-composer)] px-3 pt-2">
          <ChatReplyQuote
            reply={replyTo}
            onCancel={() => setReplyTo(null)}
            cancelLabel={t.common.cancel}
          />
        </div>
      ) : null}
      {menuFor && replyMenu.position ? (
        <ChatReplyMenu
          position={replyMenu.position}
          bubble={replyMenu.bubble}
          label={m.chatReply}
          onReply={() => {
            setReplyTo({
              id: menuFor.id,
              senderName: menuFor.authorName,
              preview:
                menuFor.body.length > 140
                  ? menuFor.body.slice(0, 140) + "\u2026"
                  : menuFor.body,
              createdAt: menuFor.createdAt,
            });
            setMenuFor(null);
            replyMenu.close();
            /*
             * Put the caret in the composer, which also raises the keyboard on a
             * phone. This runs INSIDE the click handler on purpose: mobile browsers
             * only open the keyboard for a focus() in the same user gesture, so
             * deferring it to an effect leaves a quote and no way to type.
             */
            composerRef.current?.focus();
          }}
          onClose={() => {
            setMenuFor(null);
            replyMenu.close();
          }}
        />
      ) : null}
      {/*
        No margin: the Comunicación pane this thread lives inside already ends
        above the phone footer (see `app/(app)/comunicacion/layout.tsx`, which
        subtracts `--phone-nav-height` from its 100dvh height). The composer is the
        last flow element in that pane, so sitting flush means having NO bottom
        offset at all.

        History worth keeping: this element has carried `mb-[67px]`,
        `translate-y-[2px]` and then `mb-[var(--phone-nav-height)]`, each added to
        close a gap whose real cause was the pane extending UNDER the fixed footer.
        Adding offset was compensating for a height that was already wrong, which
        is why every fix looked right once and drifted again.
      */}
      <div className="flex shrink-0 items-end gap-2 border-t border-[var(--wa-border)] bg-[var(--wa-composer)] px-3 py-2.5">
        <div className="flex min-w-0 flex-1 items-end rounded-3xl bg-[var(--wa-input)] px-4 py-2 shadow-sm">
          <textarea
            ref={composerRef}
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
