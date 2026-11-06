import { useEffect, useRef, useState } from "react";

/**
 * Gestures on a chat bubble for the WEB (docs/chat-replies.md §6).
 *
 * WHAT A GESTURE MEANS DEPENDS ON THE INPUT CLASS
 *
 * Mouse (desktop — MUST NOT CHANGE):
 *   right-click  -> reply menu
 *   press & hold -> reply menu
 *   smile button -> reaction pill
 *
 * Touch (phone browser, phone + tablet):
 *   swipe LEFT   -> reply menu (opens as soon as the bubble is pushed left)
 *   long press   -> reaction pill
 *
 * WHY THIS IS A SINGLE LISTENER, NOT REACT HANDLERS
 *
 * Three previous designs put React state in the hot path: `setDrag` on every
 * pointermove, memoised handler factories per bubble, and window listeners that
 * were re-registered by an effect whose deps changed on each of those renders.
 * Instrumenting a real phone-viewport browser showed the failure plainly:
 *
 *   gesture:down   alreadyActive: false
 *   gesture:move   hasActive: true,  dx: -18
 *   gesture:move   hasActive: false, state: swiping   <-- gesture lost mid-drag
 *
 * The gesture was being torn down by a re-render it had itself caused, from a
 * closure belonging to an earlier render. Every patch moved the breakage rather
 * than removing it.
 *
 * So: ONE set of DOM listeners on `document`, attached once, holding their state
 * in module-level variables. No React state is written during a drag — the bubble
 * is moved by writing `el.style.transform` directly. React never re-renders
 * because of a gesture, so it can never interrupt one.
 *
 * React state is used for exactly two things, both at gesture ENDS: which popover
 * is open, and where. Those are genuine UI state; the drag is not.
 */

const LONG_PRESS_MS = 500;
/** Horizontal travel before the gesture is classified at all. */
const SWIPE_SLOP_PX = 12;
/** How far the bubble follows the finger before it stops. */
const SWIPE_MAX_PX = 220;

export type ReplyMenuPosition = { x: number; y: number };
export type ReplyMenuAnchor = { left: number; top: number; right: number; bottom: number };

/** The element a gesture started on, and what it means. */
type Target = {
  el: HTMLElement;
  key: string;
  onReply: (x: number, y: number) => void;
  onReact?: (x: number, y: number) => void;
};

/* ----- module-level gesture state: outside React on purpose ----- */

let activeEl: HTMLElement | null = null;
let activeTarget: Target | null = null;
let startX = 0;
let startY = 0;
let pointerId = -1;
let mode: "idle" | "pressing" | "swiping" | "scrolling" = "idle";
let longPressTimer: ReturnType<typeof setTimeout> | null = null;
let installed = false;

function clearLongPress() {
  if (longPressTimer) {
    clearTimeout(longPressTimer);
    longPressTimer = null;
  }
}

function setTransform(el: HTMLElement | null, px: number) {
  if (!el) return;
  if (px <= 0) {
    el.style.transform = "";
    el.style.transition = "";
    return;
  }
  el.style.transition = "none";
  el.style.transform = `translateX(${-px}px)`;
}

function endGesture() {
  clearLongPress();
  setTransform(activeEl, 0);
  activeEl = null;
  activeTarget = null;
  mode = "idle";
  pointerId = -1;
  document.body.removeAttribute("data-gesture");
}

export function useReplyMenu(enabled: boolean) {
  const [position, setPosition] = useState<ReplyMenuPosition | null>(null);
  const [bubble, setBubble] = useState<ReplyMenuAnchor | null>(null);
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  /* ----- the one-time install ----- */
  useEffect(() => {
    if (typeof window === "undefined" || installed) return;
    installed = true;

    const onDown = (event: PointerEvent) => {
      if (!enabledRef.current) return;
      if (event.button === 2) return; // right-click is handled by onContextMenu
      if (activeTarget) return;

      const el = (event.target as HTMLElement | null)?.closest?.(".wa-bubble");
      if (!el) return;

      const target = registry.get(el as HTMLElement);
      if (!target) return;

      activeEl = el as HTMLElement;
      activeTarget = target;
      startX = event.clientX;
      startY = event.clientY;
      pointerId = event.pointerId;
      mode = "pressing";

      clearLongPress();
      longPressTimer = setTimeout(() => {
        longPressTimer = null;
        if (mode !== "pressing" || !activeTarget) return;
        const t = activeTarget;
        const r = t.el.getBoundingClientRect();
        setBubble({ left: r.left, top: r.top, right: r.right, bottom: r.bottom });
        setPosition({ x: startX, y: startY });
        if (event.pointerType === "touch" && t.onReact) t.onReact(startX, startY);
        else t.onReply(startX, startY);
        endGesture();
      }, LONG_PRESS_MS);
    };

    const onMove = (event: PointerEvent) => {
      if (!activeTarget) return;
      if (event.pointerId !== pointerId) return;
      const dx = event.clientX - startX;
      const dy = event.clientY - startY;

      if (mode === "swiping") {
        setTransform(activeEl, Math.min(Math.max(0, -dx), SWIPE_MAX_PX));
        return;
      }
      if (mode !== "pressing") return;

      /* Vertical intent wins, so the thread keeps scrolling under a finger. */
      if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > SWIPE_SLOP_PX) {
        mode = "scrolling";
        clearLongPress();
        return;
      }

      /*
       * THE SWIPE. Opens the reply the moment the bubble is pushed left — the
       * owner's rule. No release, no distance threshold to miss: the one thing
       * proven to work (the bubble following the finger) is the only thing this
       * needs to detect.
       */
      if (dx < -SWIPE_SLOP_PX && Math.abs(dx) > Math.abs(dy)) {
        mode = "swiping";
        clearLongPress();
        const el = activeEl;
        const t = activeTarget;
        setTransform(el, Math.min(Math.max(0, -dx), SWIPE_MAX_PX));

        /*
         * BOTH halves of the menu state.
         *
         * `onReply` sets which message (menuFor); `setPosition` is what makes the
         * menu RENDER at all — the component is guarded on
         * `menuFor && replyMenu.position`. Calling only onReply left position
         * null, so the gesture ran, the bubble moved and sprang back, and nothing
         * ever appeared. That is the bug the owner kept reporting.
         */
        const r = el?.getBoundingClientRect();
        if (r) setBubble({ left: r.left, top: r.top, right: r.right, bottom: r.bottom });
        setPosition({ x: event.clientX, y: event.clientY });
        t.onReply(event.clientX, event.clientY);

        /* The menu is open; the gesture is finished. Let the bubble spring back. */
        activeTarget = null;
        activeEl = null;
        mode = "idle";
        pointerId = -1;
        window.setTimeout(() => setTransform(el, 0), 140);
      }
    };

    const onUp = () => {
      if (!activeTarget) return;
      endGesture();
    };
    const onCancel = () => endGesture();

    window.addEventListener("pointerdown", onDown, true);
    window.addEventListener("pointermove", onMove, true);
    window.addEventListener("pointerup", onUp, true);
    window.addEventListener("pointercancel", onCancel, true);

    return () => {
      window.removeEventListener("pointerdown", onDown, true);
      window.removeEventListener("pointermove", onMove, true);
      window.removeEventListener("pointerup", onUp, true);
      window.removeEventListener("pointercancel", onCancel, true);
      installed = false;
      endGesture();
    };
  }, []);

  const close = () => {
    setPosition(null);
    setBubble(null);
  };

  return {
    position,
    bubble,
    close,
    openAt: (x: number, y: number) => setPosition({ x, y }),
    cancelLongPress: clearLongPress,
    /**
     * Register one bubble. Returns the props to spread — deliberately only
     * `onContextMenu`, because pointer handling is done by the document listener.
     */
    bubbleProps: (
      onReply: (x: number, y: number) => void,
      onReact?: (x: number, y: number) => void,
      key = "default",
    ) => {
      const register = (el: HTMLElement | null) => {
        if (!el) return;
        if (registry.get(el)?.key === key) return;
        registry.set(el, { el, key, onReply, onReact });
        /* Keep the latest openers current even when the element is reused. */
        registry.set(el, { el, key, onReply, onReact });
        return () => registry.delete(el);
      };
      return {
        ref: (el: HTMLElement | null) => {
          if (el) register(el);
        },
        onContextMenu: (event: React.MouseEvent) => {
          event.preventDefault();
          if (mode !== "idle") return;
          const r = event.currentTarget.getBoundingClientRect();
          setBubble({ left: r.left, top: r.top, right: r.right, bottom: r.bottom });
          setPosition({ x: event.clientX, y: event.clientY });
          onReply(event.clientX, event.clientY);
        },
      };
    },
  };
}

/**
 * Bubble element -> its openers.
 *
 * A WeakMap keyed by the DOM node, not React refs shared across renders: a bubble
 * can re-render a hundred times and the entry stays valid, because the element is
 * the identity.
 */
const registry = new WeakMap<HTMLElement, Target>();
