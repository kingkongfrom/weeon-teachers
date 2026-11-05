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
 *
 * The hook reports TWO things, and the menu needs both:
 *   position — where the pointer was, for the long-press fallback
 *   bubble   — the bubble's box, because the menu hangs off its top-right corner
 *              rather than sitting under the cursor, where it would cover the very
 *              text being quoted.
 */
const LONG_PRESS_MS = 500;
/** Movement past this cancels the long press. */
const MOVE_TOLERANCE_PX = 8;

export type ReplyMenuPosition = { x: number; y: number };

/** The bubble's viewport rect, so the menu can anchor to its corner. */
export type ReplyMenuAnchor = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

export function useReplyMenu(enabled: boolean) {
  const [position, setPosition] = useState<ReplyMenuPosition | null>(null);
  const [bubble, setBubble] = useState<ReplyMenuAnchor | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Where the current press began, so movement can cancel it. */
  const timerStart = useRef<{ x: number; y: number } | null>(null);

  const clearTimer = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    timerStart.current = null;
  }, []);

  useEffect(() => clearTimer, [clearTimer]);

  /** Show the menu at a point. The caller decides what it points at. */
  const openAt = useCallback(
    (x: number, y: number) => {
      clearTimer();
      setPosition({ x, y });
    },
    [clearTimer],
  );

  /** Cancel a pending long press (movement, release, leaving the bubble). */
  const cancelLongPress = useCallback(() => clearTimer(), [clearTimer]);

  const close = useCallback(() => {
    clearTimer();
    setPosition(null);
    setBubble(null);
  }, [clearTimer]);

  /**
   * Ready-made handlers for a bubble that knows its own message.
   *
   * `onOpen` receives the point the menu should appear at; the caller closes over
   * its message and records it. The bubble's rect is recorded here, because only
   * the handler has the element.
   */
  const bubbleProps = useCallback(
    (onOpen: (x: number, y: number) => void) => {
      if (!enabled) return {};

      const remember = (el: Element) => {
        const r = el.getBoundingClientRect();
        setBubble({ left: r.left, top: r.top, right: r.right, bottom: r.bottom });
      };

      return {
        onContextMenu: (event: React.MouseEvent) => {
          event.preventDefault();
          remember(event.currentTarget);
          openAt(event.clientX, event.clientY);
          onOpen(event.clientX, event.clientY);
        },
        onPointerDown: (event: React.PointerEvent) => {
          // Right-click is handled by onContextMenu.
          if (event.button === 2) return;
          const el = event.currentTarget;
          const x = event.clientX;
          const y = event.clientY;
          clearTimer();
          timerStart.current = { x, y };
          timer.current = setTimeout(() => {
            timer.current = null;
            remember(el);
            setPosition({ x, y });
            onOpen(x, y);
          }, LONG_PRESS_MS);
        },
        onPointerMove: (event: React.PointerEvent) => {
          const start = timerStart.current;
          if (!start) return;
          if (
            Math.abs(event.clientX - start.x) > MOVE_TOLERANCE_PX ||
            Math.abs(event.clientY - start.y) > MOVE_TOLERANCE_PX
          ) {
            clearTimer();
          }
        },
        onPointerUp: clearTimer,
        onPointerLeave: clearTimer,
        onPointerCancel: clearTimer,
      };
    },
    [enabled, openAt, clearTimer],
  );

  return {
    position,
    bubble,
    close,
    openAt,
    cancelLongPress,
    bubbleProps,
  };
}
