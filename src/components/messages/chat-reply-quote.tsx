"use client";

import { cn } from "@/lib/utils";
import type { ChatMessageReply } from "@/lib/messages/chat-model";

/**
 * The quoted message a reply answers, rendered exactly like WhatsApp's.
 *
 * One component, two places: above the composer while a reply is being written,
 * and inside the bubble once sent. Same accent bar, sender line and one-line
 * preview, so the draft looks like the result.
 *
 * Colours come from the existing `--wa-*` tokens. The quote sits on BOTH bubble
 * colours (the sender's green `--wa-out` and the received white `--wa-in`), so the
 * bar uses a translucent tint that reads on either rather than a fixed colour.
 */
export function ChatReplyQuote({
  reply,
  onCancel,
  cancelLabel,
  onClick,
  compact = false,
}: {
  reply: ChatMessageReply;
  /** Shows the × that discards a draft reply. */
  onCancel?: () => void;
  cancelLabel?: string;
  /** Scrolls to the original. */
  onClick?: () => void;
  /** Tighter type inside a bubble, which is already dense. */
  compact?: boolean;
}) {
  const content = (
    <div className="min-w-0 flex-1">
      <p
        className={cn(
          "truncate font-semibold text-[var(--wa-quote-name,#00a884)]",
          compact ? "text-[12.5px]" : "text-[13px]",
        )}
      >
        {reply.senderName}
      </p>
      <p
        className={cn(
          "truncate text-[var(--wa-quote-text,var(--wa-muted))]",
          compact ? "text-[12.5px]" : "text-[13px]",
        )}
      >
        {reply.preview}
      </p>
    </div>
  );

  return (
    <div
      className={cn(
        "flex items-stretch gap-2 overflow-hidden rounded-[5px] bg-[var(--wa-quote-bg)]",
        compact ? "px-1.5 py-1" : "px-2 py-1.5",
      )}
    >
      {onClick ? (
        <button
          type="button"
          onClick={onClick}
          className="flex min-w-0 flex-1 items-stretch gap-2 overflow-hidden rounded-[5px] text-left"
          aria-label={`${reply.senderName}: ${reply.preview}`}
        >
          <span
            className="w-[3px] shrink-0 rounded-full bg-[var(--wa-quote-bar,#00a884)]"
            aria-hidden
          />
          {content}
        </button>
      ) : (
        <div className="flex min-w-0 flex-1 items-stretch gap-2">
          <span
            className="w-[3px] shrink-0 rounded-full bg-[var(--wa-quote-bar,#00a884)]"
            aria-hidden
          />
          {content}
        </div>
      )}
      {onCancel ? (
        <button
          type="button"
          onClick={onCancel}
          aria-label={cancelLabel}
          className="shrink-0 px-1 text-[var(--wa-muted)] transition-colors hover:text-[var(--wa-text)]"
        >
          ×
        </button>
      ) : null}
    </div>
  );
}
