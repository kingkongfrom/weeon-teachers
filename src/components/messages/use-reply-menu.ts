"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Reply affordance for a chat bubble on the WEB (docs/chat-replies.md §6).
 *
 * The mobile app uses swipe-left. A pointer has no swipe that feels native, and
 * the owner asked for the WhatsApp-web behaviour: right-click, or press and hold.
 *
 * Both are wired because they serve different habits:
 *   * right-click — the desktop idiom, zero latency for someone who knows it
 *   * long-press  — the touch and trackpad idiom, and the only one available on a
 *                   tablet, where there is no right button
 *
 * A long press is cancelled by any meaningful pointer movement, so it never fires
 * while the user is selecting text or dragging. The threshold is deliberately 500ms:
 * short enough to feel responsive, long enough not to collide with a double-click.
 */
const LONG_PRESS_MS = 500;
/** Movement past this cancels the long press. */
const MOVE_TOLERANCE_PX = 8;

export type ReplyMenuPosition = { x: number; y: number };

export function useReplyMenu(enabled: boolean) {
  const [position, setPosition] = useState<ReplyMenuPosition | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const start = useRef<{ x: number; y: number } | null>(null);

  const clearTimer = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    start.current = null;
  }, []);

  useEffect(() => clearTimer, [clearTimer]);

  /** Right-click: open at the pointer. */
  const onContextMenu = useCallback(
    (event: React.MouseEvent) => {
      if (!enabled) return;
      event.preventDefault();
      setPosition({ x: event.clientX, y: event.clientY });
    },
    [enabled],
  );

  /** Press and hold: open where the press began. */
  const onPointerDown = useCallback(
    (event: React.PointerEvent) => {
      if (!enabled) return;
      // Right-click already handled by onContextMenu.
      if (event.button === 2) return;
      start.current = { x: event.clientX, y: event.clientY };
      clearTimer();
      timer.current = setTimeout(() => {
        const at = start.current;
        timer.current = null;
        if (at) setPosition({ x: at.x, y: at.y });
      }, LONG_PRESS_MS);
    },
    [enabled, clearTimer],
  );

  const onPointerMove = useCallback(
    (event: React.PointerEvent) => {
      if (!start.current) return;
      const dx = Math.abs(event.clientX - start.current.x);
      const dy = Math.abs(event.clientY - start.current.y);
      if (dx > MOVE_TOLERANCE_PX || dy > MOVE_TOLERANCE_PX) clearTimer();
    },
    [clearTimer],
  );

  const onPointerUp = useCallback(() => clearTimer(), [clearTimer]);
  const close = useCallback(() => setPosition(null), []);

  return {
    position,
    close,
    handlers: {
      onContextMenu,
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerLeave: onPointerUp,
      onPointerCancel: onPointerUp,
    },
  };
}
