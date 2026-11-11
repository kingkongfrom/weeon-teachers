"use client";

import { cn } from "@/lib/utils";

/**
 * The WhatsApp reaction bar (docs/chat-reactions.md, R1).
 *
 * Six quick emojis in a floating pill above the message being reacted to.
 *
 * There is NO `+` button. The bar used to render one, disabled, as a placeholder for a
 * future full picker - a control that never works, occupying a slot, which reads as a
 * broken button rather than a promise. The mobile app made the same call earlier (its
 * bar is six-only for that reason), so the two surfaces now match.
 *
 * The pill carries `wa-chat` on itself. It is rendered inside the thread, but the
 * reply menu taught us that a floating child can end up outside the token scope --
 * and every var(--wa-*) here would then be empty and the pill would render grey.
 * Carrying the scope makes that impossible.
 */
const QUICK_EMOJI = ["👍", "❤️", "😂", "😮", "😢", "🙏"] as const;

export type ReactionBarPosition = { x: number; y: number };

export function ChatReactionBar({
  position,
  onPick,
  onClose,
  label,
}: {
  position: ReactionBarPosition;
  onPick: (emoji: string) => void;
  onClose: () => void;
  /** Accessible name for the bar. */
  label: string;
}) {
  /*
   * Placement: above the pointer, right-aligned, clamped to the viewport.
   *
   * Above rather than below because the bubble sits under the cursor and a bar drawn
   * over it hides the message you are reacting to.
   */
  const WIDTH = 260;
  const HEIGHT = 48;
  const EDGE = 8;
  const GAP = 8;

  const left = Math.min(
    Math.max(EDGE, position.x - WIDTH / 2),
    window.innerWidth - WIDTH - EDGE,
  );
  const above = position.y - GAP - HEIGHT;
  const top = above >= EDGE ? above : position.y + GAP;

  return (
    <div
      role="menu"
      aria-label={label}
      style={{ left, top, width: WIDTH }}
      className={cn(
        "wa-chat fixed z-[100012] flex items-center justify-between rounded-full px-2 py-1.5",
        "bg-[var(--wa-panel)] shadow-[0_2px_6px_rgb(11_20_26/0.18),0_10px_24px_-8px_rgb(11_20_26/0.3)]",
        "ring-1 ring-[var(--wa-border)]",
      )}
      onPointerDown={(event) => event.stopPropagation()}
    >
      {QUICK_EMOJI.map((emoji) => (
        <button
          key={emoji}
          type="button"
          role="menuitem"
          onClick={() => onPick(emoji)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[20px] leading-none transition-transform hover:scale-125 hover:bg-[var(--wa-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--wa-ring)]"
          aria-label={emoji}
        >
          {emoji}
        </button>
      ))}
      {/* Invisible backdrop so a tap anywhere else dismisses the bar. */}
      <span
        className="fixed inset-0 -z-10"
        aria-hidden
        onPointerDown={onClose}
      />
    </div>
  );
}
