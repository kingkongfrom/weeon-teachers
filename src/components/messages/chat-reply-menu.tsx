"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Reply } from "lucide-react";

import { cn } from "@/lib/utils";
import type { ReplyMenuPosition } from "@/components/messages/use-reply-menu";

/**
 * The "Responder" menu that a right-click or long-press opens on a bubble.
 *
 * WHAT IT MIMICS
 *
 * WhatsApp's web menu is a floating card anchored to the bubble, not a tooltip at
 * the pointer: no border, its own dark surface, and it hangs off the TOP-RIGHT of
 * the message so the bubble stays readable while you decide. A menu drawn under
 * the cursor covers the very text you are about to quote.
 *
 * HOW THE POSITION WORKS
 *
 * The hook reports the POINTER, but the menu anchors to the BUBBLE. The bubble
 * rect is passed in, and the menu is placed just above it, right edges aligned.
 * It flips below when there is no room above (the first message on screen), and
 * clamps inside the viewport on both axes.
 *
 * Rendered into `document.body`: `position: fixed` inside an ancestor with a
 * transform, filter, will-change or contain anchors to THAT ancestor rather than
 * the viewport, which is what made the first version drift with the shell.
 */
const MENU_W = 168;
/** Kept in sync with the rendered height; used only for the flip decision. */
const MENU_H = 44;
const EDGE = 8;
/** Gap between the bubble and the menu. */
const GAP = 6;

export function ChatReplyMenu({
  position,
  bubble,
  label,
  onReply,
  onClose,
}: {
  position: ReplyMenuPosition;
  /** The bubble's viewport rect, so the menu can hang off its corner. */
  bubble?: { left: number; top: number; right: number; bottom: number } | null;
  label: string;
  onReply: () => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ w: MENU_W, h: MENU_H });

  // Measure once so the flip and the clamp use the real height.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setSize({ w: rect.width, h: rect.height });
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    // Capture phase: React's synthetic handlers on a bubble fire after this, so
    // opening the menu on one bubble and clicking another is not "outside".
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

  /*
   * Prefer the bubble's top-right corner; fall back to the pointer when no rect
   * was supplied (the long-press path can fire before a rect is recorded).
   */
  const anchorRight = bubble ? bubble.right : position.x;
  const anchorTop = bubble ? bubble.top : position.y;

  const left = Math.min(
    Math.max(EDGE, anchorRight - size.w),
    window.innerWidth - size.w - EDGE,
  );
  const above = anchorTop - GAP - size.h;
  const below = (bubble ? bubble.bottom : position.y) + GAP;
  const top = above >= EDGE ? above : Math.min(below, window.innerHeight - size.h - EDGE);

  return createPortal(
    <div
      ref={ref}
      role="menu"
      aria-label={label}
      /* Sized to its label: a fixed width left empty card to the right of a short
       * label like "Responder", which read as padding. */
      style={{ left, top }}
      className={cn(
        "fixed z-[100011] flex w-max max-w-[min(90vw,16rem)] flex-col rounded-xl px-1 py-0.5",
        // No border: a border reads as a panel inside the page, and WhatsApp's menu
        // is a floating surface above it.
        "wa-chat bg-[var(--wa-panel)] ring-1 ring-[var(--wa-border)] shadow-[0_2px_6px_rgb(11_20_26/0.18),0_8px_20px_-6px_rgb(11_20_26/0.24)]",
      )}
    >
      <button
        type="button"
        role="menuitem"
        onClick={onReply}
        className="flex items-center gap-2 rounded-lg py-1 pl-2 pr-3 text-[13.5px] font-medium text-[var(--wa-text)] transition-colors hover:bg-[var(--wa-search)] focus-visible:bg-[var(--wa-search)] focus-visible:outline-none"
      >
        <Reply className="h-4 w-4 shrink-0 text-[var(--wa-icon)]" aria-hidden />
        {label}
      </button>
    </div>,
    document.body,
  );
}
