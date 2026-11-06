import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Gestures on a chat bubble for the WEB (docs/chat-replies.md §6).
 *
 * TWO INPUT CLASSES, TWO DIFFERENT MAPPINGS.
 *
 * Mouse (desktop):
 *   right-click  -> reply menu      (the desktop idiom)
 *   smile button -> reaction pill   (hover affordance beside the bubble)
 *
 * Touch (phone browser — the case this hook used to get wrong):
 *   long press   -> REACTION pill   (what a phone user expects; it is what the
 *                                    native app does, and what WhatsApp does)
 *   swipe LEFT   -> reply menu      (a finger has no right button, so the reply
 *                                    gesture has to be a swipe — the same one the
 *                                    native app uses)
 *
 * Before this, a touch long-press opened the REPLY menu, which meant a phone user
 * reached reactions only through a small smile button, and had no swipe-to-reply
 * at all. The mapping above is the one the native app and the owner's reference
 * use; the mouse mapping is deliberately unchanged.
 *
 * A long press is cancelled by meaningful movement so it never fights a scroll,
 * and the swipe only claims the gesture once the movement is decisively
 * horizontal and leftward — a vertical drag stays a scroll.
 */
const LONG_PRESS_MS = 500;
/** Movement past this cancels the long press. */
const MOVE_TOLERANCE_PX = 8;
/** Horizontal travel that commits a swipe-to-reply. */
const SWIPE_COMMIT_PX = 72;
/** Below this the drag is not considered horizontal at all. */
const SWIPE_SLOP_PX = 12;

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
  /** Which gesture the current touch is turning into, decided once. */
  const gesture = useRef<"none" | "press" | "swipe" | "scroll">("none");
  /** The live horizontal offset, so the bubble can follow the finger. */
  const [dragX, setDragX] = useState(0);

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
    setDragX(0);
  }, [clearTimer]);

  /**
   * Ready-made handlers for a bubble that knows its own message.
   *
   * TWO openers, because the pointer type decides what the gesture means:
   *
   *   `onReply`   — mouse right-click, mouse hold, and touch swipe-left
   *   `onReact`   — touch long-press
   *
   * Both receive the point the popover should appear at. The hook tracks the
   * pointer type itself, so a caller never has to guess what a device is.
   */
  const bubbleProps = useCallback(
    (onReply: (x: number, y: number) => void, onReact?: (x: number, y: number) => void) => {
      if (!enabled) return {};

      const remember = (el: Element) => {
        const r = el.getBoundingClientRect();
        setBubble({ left: r.left, top: r.top, right: r.right, bottom: r.bottom });
      };

      return {
        onContextMenu: (event: React.MouseEvent) => {
          event.preventDefault();
          /* A touch long-press also raises contextmenu on some mobile browsers.
             The pointer handlers already decided what that gesture means, so this
             must not double-fire into a second popover. */
          if (gesture.current === "swipe" || gesture.current === "press") return;
          remember(event.currentTarget);
          openAt(event.clientX, event.clientY);
          onReply(event.clientX, event.clientY);
        },
        onPointerDown: (event: React.PointerEvent) => {
          // Right-click is handled by onContextMenu.
          if (event.button === 2) return;
          const el = event.currentTarget;
          const x = event.clientX;
          const y = event.clientY;
          const isTouch = event.pointerType === "touch";
          clearTimer();
          timerStart.current = { x, y };
          gesture.current = isTouch ? "press" : "none";

          timer.current = setTimeout(() => {
            timer.current = null;
            if (gesture.current === "swipe" || gesture.current === "scroll") return;
            remember(el);
            setPosition({ x, y });
            /*
             * THE SPLIT. A finger gets the reaction pill — that is the native
             * app's gesture and what a phone user expects. A mouse keeps the
             * reply menu, because a desktop user has no swipe and the hold IS
             * their reply affordance.
             */
            if (isTouch && onReact) onReact(x, y);
            else onReply(x, y);
          }, LONG_PRESS_MS);
        },
        onPointerMove: (event: React.PointerEvent) => {
          const start = timerStart.current;
          if (!start) return;
          const dx = event.clientX - start.x;
          const dy = event.clientY - start.y;

          if (gesture.current === "press") {
            /* Decide ONCE: a swipe, a scroll, or still a possible long press. */
            if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > SWIPE_SLOP_PX) {
              gesture.current = "scroll";
              clearTimer();
              return;
            }
            if (dx < -SWIPE_SLOP_PX && Math.abs(dx) > Math.abs(dy)) {
              gesture.current = "swipe";
              clearTimer();
            }
          }

          if (gesture.current === "swipe") {
            /* Follow the finger leftward only; damped past the commit point. */
            const travel = Math.max(0, -dx);
            setDragX(Math.min(travel, SWIPE_COMMIT_PX));
            return;
          }

          if (
            Math.abs(dx) > MOVE_TOLERANCE_PX ||
            Math.abs(dy) > MOVE_TOLERANCE_PX
          ) {
            clearTimer();
          }
        },
        onPointerUp: (event: React.PointerEvent) => {
          const wasSwipe = gesture.current === "swipe";
          const start = timerStart.current;
          const travelled = start ? start.x - event.clientX : 0;
          clearTimer();
          gesture.current = "none";
          setDragX(0);
          if (wasSwipe && travelled >= SWIPE_COMMIT_PX) onReply(event.clientX, event.clientY);
        },
        onPointerLeave: () => {
          clearTimer();
          gesture.current = "none";
          setDragX(0);
        },
        onPointerCancel: () => {
          clearTimer();
          gesture.current = "none";
          setDragX(0);
        },
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
    /** Live leftward travel during a swipe, in px. 0 at rest. */
    dragX,
  };
}
