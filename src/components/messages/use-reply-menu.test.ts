import { act, renderHook } from "@testing-library/react";

import { useReplyMenu } from "@/components/messages/use-reply-menu";

/**
 * Gesture behaviour for the chat thread.
 *
 * These are deliberately written against the SAME event path the real browser
 * uses: a `pointerdown` on the bubble element (found by class), then pointermove /
 * pointerup dispatched on window, which is where the single document listener
 * lives.
 *
 * An earlier version of this file simulated the hook's internals and passed
 * against code that was broken on a real phone. The truth is the browser probe
 * (scripts/probe-real.mjs); these tests are the fast regression guard that should
 * agree with it.
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
  const event = new PointerEvent(type, {
    bubbles: true,
    cancelable: true,
    composed: true,
    pointerId: init.pointerId ?? 1,
    pointerType: init.pointerType ?? "touch",
    clientX: init.x,
    clientY: init.y,
    buttons: type === "pointerup" ? 0 : 1,
  } as PointerEventInit);
  target.dispatchEvent(event);
}

function setup(messageId = "m1") {
  const el = makeBubble(messageId);
  const onReply = vi.fn();
  const onReact = vi.fn();
  const hook = renderHook(() => useReplyMenu(true));

  /* Register the bubble the way the component does: spread props onto it. */
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

  it("opens the reply on the MOVE, without needing a release", () => {
    const { el, onReply, hook } = setup();

    firePointer(el, "pointerdown", { x: 280, y: 220 });
    firePointer(window, "pointermove", { x: 250, y: 220 });

    expect(onReply).toHaveBeenCalledTimes(1);
    /*
     * The menu component is guarded on `menuFor && replyMenu.position`, so the
     * position MUST be set or the menu never renders — the exact defect that made
     * the swipe look dead while the gesture was fine. The state update comes from
     * a plain DOM listener, so it needs a flush before the hook report is current.
     * (scripts/probe-confirm.mjs asserts the same thing in a real browser.)
     */
    act(() => {
      vi.advanceTimersByTime(0);
    });
    hook.rerender();
    expect(hook.result.current.position).not.toBeNull();
  });

  it("ignores a brush under the slop", () => {
    const { el, onReply } = setup();

    firePointer(el, "pointerdown", { x: 280, y: 220 });
    firePointer(window, "pointermove", { x: 274, y: 220 });
    firePointer(window, "pointerup", { x: 274, y: 220 });

    expect(onReply).not.toHaveBeenCalled();
  });

  it("lets a vertical drag scroll instead of reacting", () => {
    const { el, onReply, onReact } = setup();

    firePointer(el, "pointerdown", { x: 200, y: 220 });
    firePointer(window, "pointermove", { x: 200, y: 300 });

    act(() => {
      vi.advanceTimersByTime(600);
    });

    expect(onReply).not.toHaveBeenCalled();
    expect(onReact).not.toHaveBeenCalled();
  });

  it("opens REACTIONS on a touch hold with no movement", () => {
    const { el, onReply, onReact } = setup();

    firePointer(el, "pointerdown", { x: 200, y: 220 });
    act(() => {
      vi.advanceTimersByTime(600);
    });

    expect(onReact).toHaveBeenCalledTimes(1);
    expect(onReply).not.toHaveBeenCalled();
  });

  it("keeps a MOUSE hold on reply, not reactions", () => {
    const { el, onReply, onReact } = setup();

    firePointer(el, "pointerdown", { x: 200, y: 220, pointerType: "mouse" });
    act(() => {
      vi.advanceTimersByTime(600);
    });

    expect(onReply).toHaveBeenCalledTimes(1);
    expect(onReact).not.toHaveBeenCalled();
  });

  it("clears the transform after the menu opens", () => {
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
