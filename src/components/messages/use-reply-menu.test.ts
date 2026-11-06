import { act, renderHook } from "@testing-library/react";

import { useReplyMenu } from "@/components/messages/use-reply-menu";

/**
 * Swipe-to-reply on a chat bubble.
 *
 * These follow the same event path the browser does: `pointerdown` on the bubble
 * element, then `pointermove`/`pointerup` on window, where the single document
 * listener lives.
 *
 * Two behaviours are locked in because the owner asked for them explicitly:
 *
 *   1. A swipe calls the reply opener DIRECTLY — it must not open a popover and
 *      wait for a second tap.
 *   2. There is NO long press. A resting finger drifts, and no threshold ever
 *      separated a hold from a slow swipe, so the gesture was removed rather than
 *      left ambiguous.
 *
 * The authoritative check is still scripts/probe-direct.mjs against a real
 * phone-viewport browser; these are the fast regression guard.
 */

function makeBubble(id: string) {
  const el = document.createElement("div");
  el.className = "wa-bubble";
  el.dataset.messageId = id;
  el.getBoundingClientRect = () =>
    ({ left: 100, top: 200, right: 300, bottom: 240, width: 200, height: 40, x: 100, y: 200, toJSON: () => ({}) }) as DOMRect;
  document.body.appendChild(el);
  return el;
}

function firePointer(
  target: EventTarget,
  type: string,
  init: { x: number; y: number; pointerType?: string; pointerId?: number },
) {
  target.dispatchEvent(
    new PointerEvent(type, {
      bubbles: true,
      cancelable: true,
      composed: true,
      pointerId: init.pointerId ?? 1,
      pointerType: init.pointerType ?? "touch",
      clientX: init.x,
      clientY: init.y,
      buttons: type === "pointerup" ? 0 : 1,
    } as PointerEventInit),
  );
}

function setup(messageId = "m1") {
  const el = makeBubble(messageId);
  const onReply = vi.fn();
  const onReact = vi.fn();
  const hook = renderHook(() => useReplyMenu(true));
  const props = hook.result.current.bubbleProps(onReply, onReact, messageId);
  act(() => {
    (props.ref as (node: HTMLElement | null) => void)(el);
  });
  return { el, onReply, onReact, hook, props };
}

describe("chat bubble gestures", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = "";
  });

  it("moves the bubble as the finger travels left", () => {
    const { el } = setup();

    firePointer(el, "pointerdown", { x: 280, y: 220 });
    firePointer(window, "pointermove", { x: 200, y: 220 });

    expect(el.style.transform).toBe("translateX(-80px)");
  });

  it("performs the reply directly, with no popover", () => {
    const { el, onReply, hook } = setup();

    firePointer(el, "pointerdown", { x: 280, y: 220 });
    firePointer(window, "pointermove", { x: 230, y: 220 });

    expect(onReply).toHaveBeenCalledTimes(1);
    /* No menu position is set: the swipe must not open a popover. */
    act(() => {
      vi.advanceTimersByTime(0);
    });
    hook.rerender();
    expect(hook.result.current.position).toBeNull();
  });

  it("ignores a brush under the slop", () => {
    /* 36px, because a resting finger drifts further than 12. */
    const { el, onReply } = setup();

    firePointer(el, "pointerdown", { x: 280, y: 220 });
    firePointer(window, "pointermove", { x: 260, y: 220 });
    firePointer(window, "pointerup", { x: 260, y: 220 });

    expect(onReply).not.toHaveBeenCalled();
  });

  it("opens REACTIONS on a touch hold with no movement", () => {
    const { el, onReply, onReact } = setup();

    firePointer(el, "pointerdown", { x: 200, y: 220 });
    act(() => {
      vi.advanceTimersByTime(700);
    });

    expect(onReact).toHaveBeenCalledTimes(1);
    expect(onReply).not.toHaveBeenCalled();
  });

  it("keeps the hold alive through a small finger drift", () => {
    /* A resting finger always jitters; that must not cancel the hold. */
    const { el, onReact } = setup();

    firePointer(el, "pointerdown", { x: 200, y: 220 });
    firePointer(window, "pointermove", { x: 195, y: 223 });
    act(() => {
      vi.advanceTimersByTime(700);
    });

    expect(onReact).toHaveBeenCalledTimes(1);
  });

  it("never reacts when the finger swipes first", () => {
    /* The mutual-exclusion guarantee: the swipe cancels the hold timer. */
    const { el, onReply, onReact } = setup();

    firePointer(el, "pointerdown", { x: 280, y: 220 });
    firePointer(window, "pointermove", { x: 220, y: 220 });
    act(() => {
      vi.advanceTimersByTime(900);
    });

    expect(onReply).toHaveBeenCalledTimes(1);
    expect(onReact).not.toHaveBeenCalled();
  });

  it("never reacts when the finger scrolls first", () => {
    const { el, onReact } = setup();

    firePointer(el, "pointerdown", { x: 200, y: 220 });
    firePointer(window, "pointermove", { x: 200, y: 300 });
    act(() => {
      vi.advanceTimersByTime(900);
    });

    expect(onReact).not.toHaveBeenCalled();
  });

  it("does not react on a MOUSE hold", () => {
    /* Desktop keeps the smile button; a mouse hold is not a reaction gesture. */
    const { el, onReact } = setup();

    firePointer(el, "pointerdown", { x: 200, y: 220, pointerType: "mouse" });
    act(() => {
      vi.advanceTimersByTime(900);
    });

    expect(onReact).not.toHaveBeenCalled();
  });

  it("lets a vertical drag scroll without replying", () => {
    const { el, onReply } = setup();

    firePointer(el, "pointerdown", { x: 200, y: 220 });
    firePointer(window, "pointermove", { x: 196, y: 300 });

    expect(onReply).not.toHaveBeenCalled();
  });

  it("right-click NEVER opens the reply menu", () => {
    /*
     * The owner asked for right-click-to-reply to be removed entirely, not gated
     * on a device check. onContextMenu can only react on a hold now.
     */
    const { el, onReply, hook, props } = setup();

    act(() => {
      (props.onContextMenu as (e: unknown) => void)({
        preventDefault: () => {},
        clientX: 150,
        clientY: 210,
        currentTarget: el,
      });
    });

    expect(onReply).not.toHaveBeenCalled();
    hook.rerender();
    expect(hook.result.current.position).toBeNull();
  });

  it("a hold that raises contextmenu opens reactions instead", () => {
    /*
     * Mobile browsers raise `contextmenu` for a long press. That path is the
     * reaction trigger; the reply menu must never appear from it.
     */
    const { el, onReply, onReact, props } = setup();

    firePointer(el, "pointerdown", { x: 200, y: 220 });
    act(() => {
      (props.onContextMenu as (e: unknown) => void)({
        preventDefault: () => {},
        clientX: 200,
        clientY: 220,
        currentTarget: el,
      });
    });

    expect(onReact).toHaveBeenCalledTimes(1);
    expect(onReply).not.toHaveBeenCalled();
  });

  it("springs the bubble back after replying", () => {
    const { el } = setup();

    firePointer(el, "pointerdown", { x: 280, y: 220 });
    firePointer(window, "pointermove", { x: 200, y: 220 });
    expect(el.style.transform).toBe("translateX(-80px)");

    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(el.style.transform).toBe("");
  });
});
