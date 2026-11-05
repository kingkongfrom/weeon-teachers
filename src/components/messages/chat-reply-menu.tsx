"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Reply } from "lucide-react";

import { cn } from "@/lib/utils";
import type { ReplyMenuPosition } from "@/components/messages/use-reply-menu";

/**
 * The small "Responder" menu that a right-click or long-press opens on a bubble.
 *
 * TWO THINGS THAT MATTER HERE
 *
 * 1. It renders into `document.body` through a portal. `position: fixed` inside an
 *    ancestor that has a transform, filter, `will-change` or `contain` anchors to
 *    THAT ancestor rather than the viewport, so `clientX/clientY` land somewhere
 *    else entirely. The chat sits inside a shell that animates, so the portal is
 *    not optional — it is what makes the coordinates mean what they say.
 *
 * 2. It is offset from the pointer and flips at the edges. A menu drawn exactly
 *    under the cursor has the cursor on top of the item; a menu that runs off the
 *    right edge is exactly the case for the newest message, which is where people
 *    reply most.
 */
const MENU_W = 156;
const MENU_H = 40;
/** Distance from the pointer, so the cursor never covers the item. */
const GAP = 6;
/** Minimum distance from any viewport edge. */
const EDGE = 8;

export function ChatReplyMenu({
  position,
  label,
  onReply,
  onClose,
}: {
  position: ReplyMenuPosition;
  label: string;
  onReply: () => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  // Close on Escape, outside press, or scroll — the same dismissals as a native
  // context menu.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    // `pointerdown` in the CAPTURE phase: React's synthetic handlers on the bubble
    // fire after this, so a click that opens the menu on one bubble and a click on
    // another must not both be treated as "outside".
    const onPointer = (event: PointerEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) onClose();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer, true);
    window.addEventListener("scroll", onClose, true);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer, true);
      window.removeEventListener("scroll", onClose, true);
    };
  }, [onClose]);

  const fitsRight = position.x + GAP + MENU_W + EDGE <= window.innerWidth;
  const fitsDown = position.y + GAP + MENU_H + EDGE <= window.innerHeight;
  const left = fitsRight
    ? position.x + GAP
    : Math.max(EDGE, position.x - GAP - MENU_W);
  const top = fitsDown
    ? position.y + GAP
    : Math.max(EDGE, position.y - GAP - MENU_H);

  return createPortal(
    <div
      ref={ref}
      role="menu"
      aria-label={label}
      style={{ left, top, width: MENU_W }}
      className={cn(
        "fixed z-[100] flex flex-col rounded-xl border border-[var(--wa-border)]",
        "bg-[var(--wa-panel)] p-1 shadow-[var(--wa-shadow)]",
      )}
    >
      <button
        type="button"
        role="menuitem"
        onClick={onReply}
        className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-[13.5px] font-medium text-[var(--wa-text)] transition-colors hover:bg-[var(--wa-search)] focus-visible:bg-[var(--wa-search)] focus-visible:outline-none"
      >
        <Reply className="h-4 w-4 shrink-0 text-[var(--wa-icon)]" aria-hidden />
        {label}
      </button>
    </div>,
    document.body,
  );
}
