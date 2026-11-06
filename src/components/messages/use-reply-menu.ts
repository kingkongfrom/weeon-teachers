import { useEffect, useRef, useState } from "react";

/**
 * Swipe-to-reply on a chat bubble, for the WEB (docs/chat-replies.md §6).
 *
 * ONE GESTURE, ONE ACTION.
 *
 *   Finger swipes LEFT on a bubble  -> reply to that message (the quote strip
 *                                      appears in the composer, caret focused)
 *   Mouse right-click on a bubble   -> the reply menu (the desktop affordance)
 *
 * There is NO long-press gesture. It was removed deliberately: on a real phone
 * every attempt to distinguish a hold from a slow swipe either opened the reply
 * menu on a hold or the reaction row on a swipe, because a resting finger drifts
 * by design. Reactions are reached on mobile through the message itself once that
 * gesture is specced properly; until then the gesture simply does not exist,
 * rather than existing wrongly.
 *
 * AND NO POPOVER ON SWIPE.
 *
 * Earlier versions opened a menu containing "Responder" and required a second tap.
 * The owner asked for the swipe to perform that action directly: swiping left IS
 * replying. So `onReply` is called with the message and the caller does the work —
 * quote strip, caret, done.
 *
 * WHY A SINGLE DOCUMENT LISTENER
 *
 * Three earlier designs kept React state in the hot path (setState on every
 * pointermove, memoised handler factories per bubble, window listeners
 * re-registered by effects whose deps changed on each of those renders). A real
 * phone-viewport browser proved the gesture was being torn down by a re-render it
 * had itself caused. Here the gesture state lives in module variables and the
 * bubble is moved by writing `el.style.transform` — React never re-renders during
 * a drag, so it cannot interrupt one. React state is touched only when the
 * gesture ENDS, to open the desktop menu.
 */

/** Horizontal travel that commits a swipe to reply. */
const SWIPE_SLOP_PX = 36;
/** Vertical travel that hands the gesture to the scroller instead. */
const SCROLL_SLOP_PX = 14;
/** How far the bubble follows the finger before it stops. */
const SWIPE_MAX_PX = 160;

export type ReplyMenuPosition = { x: number; y: number };
export type ReplyMenuAnchor = { left: number; top: number; right: number; bottom: number };

type Target = {
  el: HTMLElement;
  key: string;
  /** Swipe-left / right-click: reply to this message. */
  onReply: (x: number, y: number) => void;
};

/* ----- module-level gesture state: outside React on purpose ----- */

let activeEl: HTMLElement | null = null;
let activeTarget: Target | null = null;
let startX = 0;
let startY = 0;
let pointerId = -1;
let mode: "idle" | "pressing" | "swiping" | "scrolling" = "idle";
let installed = false;

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
  setTransform(activeEl, 0);
  activeEl = null;
  activeTarget = null;
  mode = "idle";
  pointerId = -1;
}

export function useReplyMenu(enabled: boolean) {
  const [position, setPosition] = useState<ReplyMenuPosition | null>(null);
  const [bubble, setBubble] = useState<ReplyMenuAnchor | null>(null);
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  useEffect(() => {
    if (typeof window === "undefined" || installed) return;
    installed = true;

    const onDown = (event: PointerEvent) => {
      if (!enabledRef.current) return;
      if (event.button === 2) return; // right-click: onContextMenu handles it
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

      /* Vertical intent wins: the thread keeps scrolling under a finger. */
      if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > SCROLL_SLOP_PX) {
        mode = "scrolling";
        return;
      }

      /*
       * THE SWIPE. Performs the reply immediately — no menu, no second tap.
       * 36px rather than 12: a resting finger drifts far more than 12, and that
       * is what made the old long-press read as a swipe.
       */
      if (dx < -SWIPE_SLOP_PX && Math.abs(dx) > Math.abs(dy)) {
        mode = "swiping";
        const el = activeEl;
        const t = activeTarget;
        setTransform(el, Math.min(Math.max(0, -dx), SWIPE_MAX_PX));
        t.onReply(event.clientX, event.clientY);
        /* Done. Let the bubble spring back. */
        activeTarget = null;
        activeEl = null;
        mode = "idle";
        pointerId = -1;
        window.setTimeout(() => setTransform(el, 0), 140);
      }
    };

    const onUp = () => {
      if (activeTarget) endGesture();
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
    cancelLongPress: () => {},
    /**
     * Register one bubble. The returned props are for the DESKTOP path only —
     * pointer handling belongs to the document listener.
     */
    bubbleProps: (
      onReply: (x: number, y: number) => void,
      _onReact?: (x: number, y: number) => void,
      key = "default",
    ) => ({
      ref: (el: HTMLElement | null) => {
        if (!el) return;
        const existing = registry.get(el);
        if (existing && existing.key === key && existing.onReply === onReply) return;
        registry.set(el, { el, key, onReply });
      },
      onContextMenu: (event: React.MouseEvent) => {
        event.preventDefault();
        if (mode !== "idle") return;
        const r = event.currentTarget.getBoundingClientRect();
        setBubble({ left: r.left, top: r.top, right: r.right, bottom: r.bottom });
        setPosition({ x: event.clientX, y: event.clientY });
        onReply(event.clientX, event.clientY);
      },
    }),
  };
}

/**
 * Bubble element -> its reply opener.
 *
 * Keyed by the DOM node rather than React refs: a bubble can re-render a hundred
 * times and the entry stays valid, because the element is the identity.
 */
const registry = new WeakMap<HTMLElement, Target>();
