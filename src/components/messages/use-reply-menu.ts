import { useEffect, useRef, useState } from "react";

/**
 * Gestures on a chat bubble, for the WEB (docs/chat-replies.md §6).
 *
 * TOUCH (phone browser, phone + tablet):
 *   swipe LEFT  -> reply to that message directly (quote strip, caret in composer)
 *   long press  -> the six-emoji reaction row
 *
 * MOUSE (desktop — unchanged):
 *   right-click -> the reply menu
 *   smile button -> the reaction row
 *
 * HOW THE TWO TOUCH GESTURES SHARE ONE FINGER
 *
 * They are separated by TIME and DIRECTION, never by a bare distance threshold —
 * which is what failed before. A resting finger drifts, so "moved 12px" cannot
 * mean swipe. The rules:
 *
 *   * A press starts a 500ms timer. Nothing has happened yet; the finger may
 *     still be a hold or the start of a swipe.
 *   * Movement LEFT past SWIPE_SLOP_PX CANCELS the timer and commits the swipe
 *     immediately. This is the owner's rule: reply starts on the move.
 *   * Movement UP/DOWN past SCROLL_SLOP_PX cancels the timer and hands the
 *     gesture to the scroller.
 *   * If neither happens and the timer survives to 500ms, it is a HOLD and opens
 *     the reaction row.
 *
 * Because the swipe cancels the timer, a swipe can never also react; because the
 * timer only fires when no qualifying movement happened, a hold can never also
 * reply. The two are mutually exclusive by construction rather than by tuning.
 *
 * SWIPE_SLOP_PX is 36 rather than 12 for one reason: a finger resting on glass
 * drifts 5–20px, and at 12 a hold became a swipe. The timer makes the exact value
 * far less critical — it only decides how quickly a deliberate swipe responds.
 *
 * WHY A SINGLE DOCUMENT LISTENER
 *
 * Three earlier designs kept React state in the hot path (setState per
 * pointermove, handler factories per bubble, effects re-registering listeners on
 * each of those renders). A real phone-viewport browser showed the gesture being
 * torn down by a re-render it had itself caused. Gesture state lives in module
 * variables here, and the bubble is moved by writing `el.style.transform` — React
 * never re-renders during a drag, so it cannot interrupt one. React state is
 * touched only when a gesture ENDS.
 */

const LONG_PRESS_MS = 500;
/** Horizontal travel that commits a swipe. */
const SWIPE_SLOP_PX = 36;
/** Vertical travel that hands the gesture to the scroller. */
const SCROLL_SLOP_PX = 14;
/** How far the bubble follows the finger before it stops. */
const SWIPE_MAX_PX = 160;
/**
 * Movement under this does not cancel a hold.
 *
 * Deliberately small: it exists so a finger that jitters a pixel still counts as
 * still, not to separate gestures (the timer does that).
 */
const HOLD_TOLERANCE_PX = 10;

export type ReplyMenuPosition = { x: number; y: number };
export type ReplyMenuAnchor = { left: number; top: number; right: number; bottom: number };

type Target = {
  el: HTMLElement;
  key: string;
  /** Swipe-left (touch): reply to this message immediately. */
  onReply: (x: number, y: number) => void;
  /** Long press (touch): open the reaction row. */
  onReact?: (x: number, y: number) => void;
  /** Right-click (desktop): open the reply POPOVER for this message. */
  onMenu?: (x: number, y: number) => void;
};

/* ----- module-level gesture state: outside React on purpose ----- */

let activeEl: HTMLElement | null = null;
let activeTarget: Target | null = null;
let startX = 0;
let startY = 0;
let pointerId = -1;
let mode: "idle" | "pressing" | "swiping" | "scrolling" = "idle";
let installed = false;
let holdTimer: ReturnType<typeof setTimeout> | null = null;
/**
 * True when the press immediately before the current event came from a mouse.
 *
 * A `contextmenu` event does not reliably carry `pointerType`, but it is always
 * preceded by its own pointerdown — so the press that caused it is recorded here
 * and read back. This is what separates "desktop right-click" from "mobile long
 * press", which raise the SAME event and must do different things.
 */
let lastPointerWasMouse = false;


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

function clearHold() {
  if (holdTimer) {
    clearTimeout(holdTimer);
    holdTimer = null;
  }
}

function endGesture() {
  clearHold();
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

      /*
       * THE HOLD CANDIDATE — long press opens the reaction row.
       *
       * Armed for anything that is not a mouse. Requiring
       * `pointerType === "touch"` exactly was wrong: some mobile browsers report
       * the type as an empty string or "pen", and the timer was then never armed
       * at all — indistinguishable from "long press does nothing". A mouse is the
       * one case we can identify reliably, so that is what we exclude.
       *
       * The timer is cancelled by the swipe and by a scroll, so a hold can never
       * also reply and a swipe can never also react.
       */
      clearHold();
      if (event.pointerType !== "mouse" && target.onReact) {
        holdTimer = setTimeout(() => {
          holdTimer = null;
          /* Only a press that never turned into a swipe or a scroll. */
          if (mode !== "pressing" || !activeTarget) return;
          const t = activeTarget;
          const r = t.el.getBoundingClientRect();
          setBubble({ left: r.left, top: r.top, right: r.right, bottom: r.bottom });
          setPosition({ x: startX, y: startY });
          t.onReact?.(startX, startY);
          endGesture();
        }, LONG_PRESS_MS);
      }
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
      if (Math.abs(dy) > SCROLL_SLOP_PX && Math.abs(dy) > Math.abs(dx)) {
        mode = "scrolling";
        clearHold();
        return;
      }

      /*
       * THE SWIPE. Commits on the move and CANCELS the hold timer, so a swipe can
       * never also open the reaction row.
       */
      if (dx < -SWIPE_SLOP_PX && Math.abs(dx) > Math.abs(dy)) {
        mode = "swiping";
        clearHold();
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
        return;
      }

      /* A small drift keeps the hold alive; anything larger is not a hold. */
      if (Math.abs(dx) > HOLD_TOLERANCE_PX || Math.abs(dy) > HOLD_TOLERANCE_PX) {
        clearHold();
      }
    };

    const onUp = () => {
      if (activeTarget) endGesture();
      else clearHold();
    };
    /*
     * A cancel clears state. Unlike the swipe — which commits on the move and so
     * does not care — a HOLD is only lost here if the browser took the gesture
     * before 500ms (scrolling intent, system back-swipe). By then the user has
     * not finished holding, so abandoning it is correct.
     */
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
    cancelLongPress: clearHold,
    /**
     * Register one bubble. Android raises `contextmenu` for a touch hold, and the
     * popup it would open would sit under ours — so the native menu is always
     * suppressed here.
     */
    bubbleProps: (
      onReply: (x: number, y: number) => void,
      onReact?: (x: number, y: number) => void,
      onMenu?: (x: number, y: number) => void,
      key = "default",
    ) => ({
      ref: (el: HTMLElement | null) => {
        if (!el) return;
        const existing = registry.get(el);
        const same =
          existing &&
          existing.key === key &&
          existing.onReply === onReply &&
          existing.onReact === onReact &&
          existing.onMenu === onMenu;
        if (same) return;
        registry.set(el, { el, key, onReply, onReact, onMenu });
      },
      onContextMenu: (event: React.MouseEvent) => {
        /* Always suppress the browser's own menu. */
        event.preventDefault();

        const el = event.currentTarget as HTMLElement;
        const target = registry.get(el);
        if (!target) return;

        /*
         * DESKTOP vs MOBILE — decided by the DEVICE, not by transient state.
         *
         * A real right-click always comes from a mouse; a hold on a phone never
         * does. `matchMedia("(hover: hover)")` identifies a desktop-class device
         * without depending on gesture state, which is gone by the time this
         * event arrives (see below).
         */
        const isDesktop =
          typeof window !== "undefined" &&
          typeof window.matchMedia === "function" &&
          window.matchMedia("(hover: hover)").matches;

        if (isDesktop) {
          /*
           * DESKTOP: right-click opens the POPOVER, it does not reply.
           *
           * The menu renders on `menuFor && replyMenu.position`; setting position
           * and letting the caller pick the message is what makes it appear.
           * Clicking "Responder" in that popover is what replies.
           *
           * `contextmenu` fires AFTER pointerup, so the document listener has
           * already reset `mode` by now — that is why an earlier version gated on
           * `mode === "pressing"` and opened nothing at all on desktop.
           */
          const r = el.getBoundingClientRect();
          setBubble({ left: r.left, top: r.top, right: r.right, bottom: r.bottom });
          setPosition({ x: event.clientX, y: event.clientY });
          target.onMenu?.(event.clientX, event.clientY);
          return;
        }

        /*
         * MOBILE: a long press raises contextmenu. Open the reaction row. This
         * can never open the reply menu.
         */
        if (!target.onReact) return;
        clearHold();
        const r = el.getBoundingClientRect();
        setBubble({ left: r.left, top: r.top, right: r.right, bottom: r.bottom });
        setPosition({ x: event.clientX, y: event.clientY });
        target.onReact(event.clientX, event.clientY);
        endGesture();
      },
      /*
       * THE HOLD TIMER, ON THE BUBBLE ITSELF.
       *
       * This is how the original implementation worked, before the rewrite moved
       * everything to a document listener: a React handler ON the element, so the
       * element is simply `event.currentTarget` — no hit-testing, no registry
       * lookup, nothing that can lose which bubble was pressed.
       *
       * The document listener still owns moving the bubble during a swipe. This
       * handler exists only to arm the hold, and it is the path that actually
       * works on a real phone.
       */
      onPointerDown: (event: React.PointerEvent) => {
        /*
         * Record the input class BEFORE anything else: the `contextmenu` that a
         * right-click or a hold produces reads it back to decide what to do.
         */
        lastPointerWasMouse = event.pointerType === "mouse";

        if (event.button === 2) return;
        const el = event.currentTarget as HTMLElement;
        const target = registry.get(el);
        if (!target?.onReact) return;
        /* Desktop has the right-click affordance; no hold timer there. */
        if (lastPointerWasMouse) return;

        clearHold();
        const x = event.clientX;
        const y = event.clientY;
        holdTimer = setTimeout(() => {
          holdTimer = null;
          const r = el.getBoundingClientRect();
          setBubble({ left: r.left, top: r.top, right: r.right, bottom: r.bottom });
          setPosition({ x, y });
          target.onReact?.(x, y);
          endGesture();
        }, LONG_PRESS_MS);
      },
      onPointerUp: () => clearHold(),
      onPointerLeave: () => clearHold(),
    }),
  };
}

/**
 * Bubble element -> its openers.
 *
 * Keyed by the DOM node rather than React refs: a bubble can re-render a hundred
 * times and the entry stays valid, because the element is the identity.
 */
const registry = new WeakMap<HTMLElement, Target>();
