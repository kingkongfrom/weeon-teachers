import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Gestures on a chat bubble for the WEB (docs/chat-replies.md §6).
 *
 * WHAT A GESTURE MEANS DEPENDS ON THE INPUT CLASS
 *
 * Mouse (desktop — MUST NOT CHANGE):
 *   right-click  -> reply menu
 *   press & hold -> reply menu
 *   smile button -> reaction pill   (hover affordance beside the bubble)
 *
 * Touch (phone browser, phone + tablet):
 *   swipe LEFT   -> reply menu
 *   long press   -> reaction pill
 *
 * WHY THIS FILE WAS REWRITTEN
 *
 * The previous version opened a swipe by adding window listeners from inside a
 * memoised factory. Every `pointermove` called `setDragX`, which re-rendered the
 * thread, which produced NEW handler objects closing over a NEW `detach`
 * variable — while the live window listener still held the OLD one. The result
 * was a gesture that could start but never reliably finish: listeners leaked,
 * `gesture` got reset from a stale closure, and the reply menu never opened.
 *
 * The fix is architectural rather than another patch: ALL gesture state lives in
 * refs that outlive renders, and the window listeners are attached and detached
 * by a single mechanism that reads those refs. Re-rendering can no longer
 * strand a gesture.
 *
 * THRESHOLDS
 *
 *   SWIPE_SLOP_PX     movement before the gesture type is decided at all, so
 *                     a tap is never ambiguous
 *   SWIPE_COMMIT_PX   how far left to travel for the release to open reply
 *   LONG_PRESS_MS     how long to hold for the reaction pill
 *
 * A vertical drag is a SCROLL and cancels everything: the thread must keep
 * scrolling under a finger.
 */

const LONG_PRESS_MS = 500;
const SWIPE_SLOP_PX = 12;
const SWIPE_COMMIT_PX = 64;
/** Past this the bubble stops following the finger. */
const SWIPE_MAX_PX = 80;

export type ReplyMenuPosition = { x: number; y: number };

/** The bubble's viewport rect, so the menu can anchor to its corner. */
export type ReplyMenuAnchor = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

type GestureState =
  | "idle"
  | "pressing"
  | "swiping"
  | "scrolling";

/** Everything one touch needs, kept in a ref so renders cannot lose it. */
type ActiveGesture = {
  pointerId: number;
  startX: number;
  startY: number;
  isTouch: boolean;
  element: Element;
  /** The bubble this gesture belongs to, so only IT follows the finger. */
  key: string;
};

export function useReplyMenu(enabled: boolean) {
  const [position, setPosition] = useState<ReplyMenuPosition | null>(null);
  const [bubble, setBubble] = useState<ReplyMenuAnchor | null>(null);
  /*
   * WHICH bubble is being dragged, and by how much — reported together.
   *
   * A single `dragX` number on the hook was read by EVERY bubble, so a swipe
   * translated the whole transcript instead of the one message under the finger.
   * The key identifies the bubble so only that one reads a non-zero offset.
   */
  const [drag, setDrag] = useState<{ key: string | null; x: number }>({ key: null, x: 0 });

  /** The gesture currently in flight. Survives re-renders by design. */
  const active = useRef<ActiveGesture | null>(null);
  const state = useRef<GestureState>("idle");
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Set while window listeners for the swipe are attached. */
  const windowListeners = useRef(false);

  /** The openers must be readable from window handlers that outlive a render. */
  const openers = useRef<{
    onReply?: (x: number, y: number) => void;
    onReact?: (x: number, y: number) => void;
  }>({});

  const clearLongPress = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const remember = useCallback((el: Element) => {
    const r = el.getBoundingClientRect();
    setBubble({ left: r.left, top: r.top, right: r.right, bottom: r.bottom });
  }, []);

  /** Put the whole gesture machine back to rest. Safe to call repeatedly. */
  const reset = useCallback(() => {
    clearLongPress();
    active.current = null;
    state.current = "idle";
    setDrag({ key: null, x: 0 });
  }, [clearLongPress]);

  /*
   * THE WINDOW HANDLERS — one pair, attached once, reading refs.
   *
   * Defined with useCallback and registered in an effect, NOT created per
   * render, so a re-render mid-swipe cannot strand them.
   */
  const handleWindowMove = useCallback((event: PointerEvent) => {
    const g = active.current;
    if (!g || event.pointerId !== g.pointerId) return;
    const dx = event.clientX - g.startX;
    const dy = event.clientY - g.startY;

    if (state.current === "swiping") {
      setDrag({ key: g.key, x: Math.min(Math.max(0, -dx), SWIPE_MAX_PX) });
      return;
    }

    if (state.current !== "pressing") return;

    /* Decide ONCE: scroll, or swipe. Otherwise it stays a possible long press. */
    if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > SWIPE_SLOP_PX) {
      state.current = "scrolling";
      clearLongPress();
      return;
    }
    if (dx < -SWIPE_SLOP_PX && Math.abs(dx) > Math.abs(dy)) {
      state.current = "swiping";
      clearLongPress();
      setDrag({ key: g.key, x: Math.min(Math.max(0, -dx), SWIPE_MAX_PX) });
    }
  }, [clearLongPress]);

  const handleWindowUp = useCallback(
    (event: PointerEvent) => {
      const g = active.current;
      if (!g || event.pointerId !== g.pointerId) return;
      const wasSwiping = state.current === "swiping";
      const travelled = g.startX - event.clientX;
      reset();
      if (wasSwiping && travelled >= SWIPE_COMMIT_PX) {
        openers.current.onReply?.(event.clientX, event.clientY);
      }
    },
    [reset],
  );

  const handleWindowCancel = useCallback(() => reset(), [reset]);

  /* Attach the window listeners for the lifetime of the hook, not per gesture. */
  useEffect(() => {
    if (typeof window === "undefined" || !enabled) return;
    if (windowListeners.current) return;
    windowListeners.current = true;
    window.addEventListener("pointermove", handleWindowMove);
    window.addEventListener("pointerup", handleWindowUp);
    window.addEventListener("pointercancel", handleWindowCancel);
    return () => {
      window.removeEventListener("pointermove", handleWindowMove);
      window.removeEventListener("pointerup", handleWindowUp);
      window.removeEventListener("pointercancel", handleWindowCancel);
      windowListeners.current = false;
      reset();
    };
  }, [enabled, handleWindowMove, handleWindowUp, handleWindowCancel, reset]);

  const openAt = useCallback(
    (x: number, y: number) => {
      clearLongPress();
      setPosition({ x, y });
    },
    [clearLongPress],
  );

  const close = useCallback(() => {
    reset();
    setPosition(null);
    setBubble(null);
  }, [reset]);

  const cancelLongPress = useCallback(() => clearLongPress(), [clearLongPress]);

  /**
   * Handlers for one bubble.
   *
   * `onReply` — mouse right-click, mouse hold, touch swipe-left.
   * `onReact` — touch long-press.
   * `key`     — this bubble's id, so the drag offset can be reported for ONE
   *             message. Without it every bubble translated together.
   */
  const bubbleProps = useCallback(
    (
      onReply: (x: number, y: number) => void,
      onReact?: (x: number, y: number) => void,
      key = "default",
    ) => {
      if (!enabled) return {};

      /* Always current, even for a window handler created before the last render. */
      openers.current = { onReply, onReact };

      return {
        onContextMenu: (event: React.MouseEvent) => {
          /* Always stop the native menu; we draw our own. */
          event.preventDefault();
          /*
           * On touch, a hold ALSO raises contextmenu in Android Chrome. The
           * pointer path already decided what that hold means (the pill), so
           * this must not open the reply menu on top of it.
           */
          if (state.current !== "idle") return;
          /* Mouse/pen: right-click replies. */
          remember(event.currentTarget);
          openAt(event.clientX, event.clientY);
          onReply(event.clientX, event.clientY);
        },

        onPointerDown: (event: React.PointerEvent) => {
          if (event.button === 2) return; // right-click: onContextMenu handles it
          if (active.current) return; // a gesture is already running

          const isTouch = event.pointerType === "touch";
          active.current = {
            pointerId: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            isTouch,
            element: event.currentTarget,
            key,
          };
          state.current = "pressing";

          const x = event.clientX;
          const y = event.clientY;
          const element = event.currentTarget;
          clearLongPress();
          longPressTimer.current = setTimeout(() => {
            longPressTimer.current = null;
            /* A long press only stands if nothing moved us elsewhere. */
            if (state.current !== "pressing") return;
            remember(element);
            setPosition({ x, y });
            if (isTouch && openers.current.onReact) openers.current.onReact(x, y);
            else openers.current.onReply?.(x, y);
            reset();
          }, LONG_PRESS_MS);
        },

        /*
         * `onPointerLeave` and `onPointerUp` are deliberately NOT used to finish
         * a swipe: on touch the finger leaves the bubble almost immediately and
         * the element stops receiving these. The window handlers own it.
         */
      };
    },
    [enabled, openAt, remember, clearLongPress, reset],
  );

  return {
    position,
    bubble,
    close,
    openAt,
    cancelLongPress,
    bubbleProps,
    /** Which bubble is being dragged, and by how many px. */
    drag,
  };
}
