import { act, renderHook } from "@testing-library/react";

import { useReplyMenu } from "@/components/messages/use-reply-menu";

/**
 * The gesture state machine behind swipe-to-reply and long-press-to-react.
 *
 * These exist because this logic has been broken TWICE on a real phone while
 * every static check passed:
 *
 *   1. the swipe died on `pointerleave` the instant the finger left the bubble;
 *   2. the swipe could start but never finish, because the release listener was
 *      stranded by a re-render.
 *
 * Both are reproducible here without a browser: drive the pointer events and
 * assert which opener fired. If a future change breaks a gesture, one of these
 * fails instead of the owner finding it on their phone.
 */

/** Minimal pointer event shape the hook reads. */
function pointer(
  type: string,
  init: { x: number; y: number; pointerType?: string; button?: number; pointerId?: number },
) {
  const event = new Event(type, { bubbles: true }) as unknown as PointerEvent;
  Object.assign(event, {
    clientX: init.x,
    clientY: init.y,
    pointerType: init.pointerType ?? "touch",
    button: init.button ?? 0,
    pointerId: init.pointerId ?? 1,
  });
  return event;
}

function setup(messageKey = "msg-1") {
  const onReply = vi.fn();
  const onReact = vi.fn();
  const hook = renderHook(() => useReplyMenu(true));

  /* A stand-in for the bubble element the handlers are attached to. */
  const element = document.createElement("div");
  element.getBoundingClientRect = () =>
    ({ left: 10, top: 20, right: 210, bottom: 60, width: 200, height: 40, x: 10, y: 20, toJSON: () => ({}) }) as DOMRect;
  document.body.appendChild(element);

  const handlers = hook.result.current.bubbleProps(onReply, onReact, messageKey);

  const down = (x: number, y: number, pointerType = "touch") =>
    act(() => {
      (handlers.onPointerDown as (e: unknown) => void)({
        button: 0,
        pointerId: 1,
        clientX: x,
        clientY: y,
        pointerType,
        currentTarget: element,
      });
    });

  const move = (x: number, y: number) =>
    act(() => {
      window.dispatchEvent(pointer("pointermove", { x, y }));
    });

  const up = (x: number, y: number) =>
    act(() => {
      window.dispatchEvent(pointer("pointerup", { x, y }));
    });

  return { hook, onReply, onReact, element, handlers, down, move, up };
}

describe("useReplyMenu gestures", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = "";
  });

  it("opens REPLY when a touch swipes far enough left", () => {
    const { onReply, onReact, down, move, up } = setup();

    down(200, 40);
    move(180, 40); // past slop -> swiping
    move(120, 40);
    up(120, 40); // travelled 80 >= 64

    expect(onReply).toHaveBeenCalledTimes(1);
    expect(onReact).not.toHaveBeenCalled();
  });

  it("does NOT reply when the swipe is short of the commit distance", () => {
    const { onReply, down, move, up } = setup();

    down(200, 40);
    move(180, 40);
    up(180, 40); // travelled 20 < 64

    expect(onReply).not.toHaveBeenCalled();
  });

  it("still finishes the swipe after the finger leaves the bubble", () => {
    /*
     * The regression that shipped: the release must be seen even though the
     * finger is now far outside the element. The window listener owns it.
     */
    const { onReply, down, move, up } = setup();

    down(200, 40);
    move(180, 40);
    move(60, 40); // way outside any element box
    up(60, 40);

    expect(onReply).toHaveBeenCalledTimes(1);
  });

  it("opens REACTIONS on a touch long press with no movement", () => {
    const { onReply, onReact, down } = setup();

    down(100, 40);
    act(() => {
      vi.advanceTimersByTime(600);
    });

    expect(onReact).toHaveBeenCalledTimes(1);
    expect(onReply).not.toHaveBeenCalled();
  });

  it("does NOT react when the finger scrolls vertically", () => {
    const { onReply, onReact, down, move } = setup();

    down(100, 40);
    move(100, 120); // vertical: a scroll
    act(() => {
      vi.advanceTimersByTime(600);
    });

    expect(onReact).not.toHaveBeenCalled();
    expect(onReply).not.toHaveBeenCalled();
  });

  it("keeps the MOUSE hold on reply, not reactions", () => {
    /* Desktop behaviour must not change. */
    const { onReply, onReact, down } = setup();

    down(100, 40, "mouse");
    act(() => {
      vi.advanceTimersByTime(600);
    });

    expect(onReply).toHaveBeenCalledTimes(1);
    expect(onReact).not.toHaveBeenCalled();
  });

  it("exposes the live drag distance while swiping and clears it on release", () => {
    const { hook, down, move, up } = setup("msg-1");

    down(200, 40);
    move(180, 40);
    move(150, 40);

    expect(hook.result.current.drag).toEqual({ key: "msg-1", x: 50 });

    up(150, 40);
    expect(hook.result.current.drag).toEqual({ key: null, x: 0 });
  });

  it("keys the drag to the SWIPED bubble only", () => {
    /*
     * The bug that shipped: `dragX` was a single number on the hook, so every
     * bubble read the same offset and the whole transcript slid sideways. The
     * offset must carry the id of the message under the finger, so a bubble
     * compares it against its own id before moving.
     */
    const a = setup("msg-A");
    a.down(200, 40);
    a.move(180, 40);
    a.move(160, 40);

    expect(a.hook.result.current.drag.key).toBe("msg-A");
    expect(a.hook.result.current.drag.x).toBeGreaterThan(0);

    /* Any other bubble sees a key that is not its own, so it stays put. */
    expect(a.hook.result.current.drag.key).not.toBe("msg-B");

    a.up(160, 40);
  });

  it("still replies when the browser CANCELS the gesture after the swipe", () => {
    /*
     * Mobile browsers fire pointercancel when they take a gesture for scrolling
     * or the system back-swipe. The bubble had already moved, so the user thinks
     * the swipe worked — dropping the commit there makes it look broken.
     */
    const { onReply, down, move } = setup();

    down(200, 40);
    move(180, 40);
    move(120, 40);

    act(() => {
      window.dispatchEvent(pointer("pointercancel", { x: 120, y: 40 }));
    });

    expect(onReply).toHaveBeenCalledTimes(1);
  });

  it("does NOT reply when a cancel arrives before the commit distance", () => {
    const { onReply, down, move } = setup();

    down(200, 40);
    move(180, 40);
    act(() => {
      window.dispatchEvent(pointer("pointercancel", { x: 180, y: 40 }));
    });

    expect(onReply).not.toHaveBeenCalled();
  });
});
