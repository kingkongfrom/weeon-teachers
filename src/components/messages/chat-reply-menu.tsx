"use client";

import { useEffect, useRef } from "react";
import { Reply } from "lucide-react";

import { cn } from "@/lib/utils";
import type { ReplyMenuPosition } from "@/components/messages/use-reply-menu";

/**
 * The small "Responder" menu that a right-click or long-press opens on a bubble.
 *
 * Rendered at the pointer position, flipped when it would overflow the viewport —
 * a menu that runs off the right edge on the newest message, which is exactly where
 * people reply, would be worse than no menu.
 */
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

  // Close on Escape, outside click, or scroll — the same dismissals as a native
  // context menu.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
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

  // Keep the menu on screen: flip left when it would pass the right edge.
  const MENU_W = 148;
  const MENU_H = 40;
  const left = Math.min(position.x, window.innerWidth - MENU_W - 8);
  const top = Math.min(position.y, window.innerHeight - MENU_H - 8);

  return (
    <div
      ref={ref}
      role="menu"
      aria-label={label}
      style={{ left, top }}
      className={cn(
        "fixed z-50 flex items-center rounded-lg border border-[var(--wa-border)]",
        "bg-[var(--wa-panel)] p-1 shadow-[var(--wa-shadow)]",
      )}
    >
      <button
        type="button"
        role="menuitem"
        onClick={onReply}
        className="flex w-[140px] items-center gap-2 rounded-md px-2.5 py-1.5 text-[13.5px] font-medium text-[var(--wa-text)] transition-colors hover:bg-[var(--wa-search)]"
      >
        <Reply className="h-4 w-4 text-[var(--wa-icon)]" aria-hidden />
        {label}
      </button>
    </div>
  );
}
