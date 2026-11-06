# Chat gestures on web — how one finger drives two actions

*Written 6 Nov 2026, after the gesture work took far longer than it should have.
Read this before touching `use-reply-menu.ts` in **either** repo
(`weeon-teachers` and `weeon-tenants` each carry a copy).*

## What each input does

| Input | Action |
| --- | --- |
| Swipe left (touch) | **Reply** — quote strip in the composer, caret focused |
| Long press (touch) | **Reaction row** — the six emoji |
| Right-click (desktop) | **Reply popover** — clicking "Responder" in it replies |
| Smile button (desktop hover) | Reaction row |

Three separate callbacks (`onReply`, `onReact`, `onMenu`). They are separate on
purpose: an earlier version used one callback for two meanings and right-click
silently became reply.

## How the two touch gestures coexist

**By timing, not by distance.** A distance threshold cannot work — a resting
finger drifts, so "moved 12px" is as true of a hold as of a swipe.

```
press          -> arm a 500ms hold timer. Nothing decided yet.
move LEFT 36px -> cancel the timer, reply now
move UP/DOWN   -> cancel the timer, hand the gesture to the scroller
timer to 500ms -> HOLD: open the reaction row
```

Because the swipe cancels the timer, a swipe can never also react. Because the
timer only fires when no qualifying move happened, a hold can never also reply.

`36px` only decides how quickly a deliberate swipe responds — the timer is what
separates the gestures. Do not "tune" it expecting different behaviour.

## Three traps, each of which cost hours

### 1. `pointerType === "touch"` is not reliable

Some mobile browsers report it as an empty string, or `"pen"`. Requiring an exact
`"touch"` meant the hold timer **never armed**, which looks identical to "the
gesture does not exist". Exclude the mouse instead: that is the one case that can
be identified reliably.

### 2. `contextmenu` fires AFTER `pointerup`

On a desktop right-click the order is
`pointerdown → pointerup → contextmenu`. The document listener resets gesture
state on `pointerup`, so any `contextmenu` branch gated on that state is already
dead by the time it runs — which is why right-click once opened nothing at all.

Decide the device with `matchMedia("(hover: hover)")`, never with gesture state.

### 3. Put the hold timer ON THE BUBBLE, not on the document

A document-level listener cannot know which bubble was pressed once the finger
moves. A React `onPointerDown` on the element has `event.currentTarget` — the
message itself. The teacher web's hold only started working once it was put back
on the bubble.

The document listener still owns the swipe (it must keep receiving movement
after the finger leaves the bubble).

## Verifying — and why it kept failing

**Synthetic events in unit tests do not reproduce a real finger.** Three fixes
were shipped that passed every test and still failed on the owner's phone.

The harness that works is Playwright with **real CDP touch events**:

```powershell
node scripts/probe-gestures.mjs      # phone: long press vs swipe
node scripts/probe-both-views.mjs    # desktop right-click vs phone hold
```

It needs a signed-in session. `scripts/open-browser.mjs` opens a persistent
profile so a human logs in once; afterwards the probe reuses it.

**Test one gesture per page load.** Running a hold and then a swipe in the same
session leaves the reaction overlay open, and the second gesture targets a
covered element — which produced a false "the swipe is broken" reading.

## Files

| File | Role |
| --- | --- |
| `use-reply-menu.ts` | The gesture state machine (teachers: `src/components/messages/`, tenants: `components/comms/`) |
| `chat-thread.tsx` / `admin-teacher-chat-thread.tsx` | Wire the three openers |
| `chat-live-messages.ts` | Merging realtime echoes — see below |
| `chat-layout-do-not-touch.md` | ⛔ the phone layout is frozen |

## Related defect found the same day

`mergeChatMessages` was "incoming wins", which lost data:

- **teachers:** the socket echo (id/body/author/time only) overwrote the local
  row, dropping the reply quote and reactions. A sender's own reply showed no
  quote until a reload.
- **tenants:** worse — the map started empty, so every realtime insert **replaced
  the whole thread**.

Both now keep existing fields when an incoming row does not carry them.
