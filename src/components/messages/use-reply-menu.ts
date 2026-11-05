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
 * The hook owns the POSITION and the timer. It deliberately does not know which
 * message the menu belongs to — the caller does, and supplies it in `onOpen`.
 * An earlier version returned only raw handlers, so the menu had a position and no
 * message and therefore never rendered; `openAt` takes a callback for exactly that
 * reason.
 */
const LONG_PRESS_MS = 500;
/** Movement past this cancels the long press. */
const MOVE_TOLERANCE_PX = 8;

export type ReplyMenuPosition = { x: number; y: number };

export function useReplyMenu(enabled: boolean) {
  const [position, setPosition] = useState<ReplyMenuPosition | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Where the current press began, so movement can cancel it. */
  const timerStart = useRef<{ x: number; y: number } | null>(null);

  const clearTimer = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  useEffect(() => clearTimer, [clearTimer]);

  /** Show the menu at a point. The caller decides what it points at. */
  const openAt = useCallback((x: number, y: number) => {
    clearTimer();
    setPosition({ x, y });
  }, [clearTimer]);

  /** Begin a long-press that fires `onFire` after the threshold. */
  const startLongPress = useCallback(
    (x: number, y: number, onFire: () => void) => {
      if (!enabled) return;
      clearTimer();
      let start = { x, y };
      timer.current = setTimeout(() => {
        timer.current = null;
        onFire();
      }, LONG_PRESS_MS);
      // Remember where it began so movement can cancel it.
      timerStart.current = start;
    },
    [enabled, clearTimer],
  );

  /** Cancel a pending long press (movement, release, leaving the bubble). */
  const cancelLongPress = useCallback(() => clearTimer(), [clearTimer]);

  const close = useCallback(() => {
    clearTimer();
    setPosition(null);
  }, [clearTimer]);

  /**
   * Ready-made handlers for a bubble that knows its own message.
   *
   * `onOpen` receives the point the menu should appear at; the caller closes over
   * its message and records it. This is the shape both web chats use.
   */
  const bubbleProps = useCallback(
    (onOpen: (x: number, y: number) => void) => {
      if (!enabled) return {};
      return {
        onContextMenu: (event: React.MouseEvent) => {
          event.preventDefault();
          openAt(event.clientX, event.clientY);
          onOpen(event.clientX, event.clientY);
        },
        onPointerDown: (event: React.PointerEvent) => {
          // Right-click is handled by onContextMenu.
          if (event.button === 2) return;
          clearTimer();
          timerStart.current = { x: event.clientX, y: event.clientY };
          timer.current = setTimeout(() => {
            timer.current = null;
            setPosition({ x: event.clientX, y: event.clientY });
            onOpen(event.clientX, event.clientY);
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
    close,
    openAt,
    cancelLongPress,
    bubbleProps,
  };
}
