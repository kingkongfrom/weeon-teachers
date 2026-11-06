# Comunicación chat — phone composer & footer

> ## ⛔ DO NOT TOUCH THE COMPOSER POSITION OR THE FOOTER
>
> **The owner set these values by eye and they are final.** Do not "fix",
> "improve", "align", "tighten", "standardise" or "clean up" the composer's
> offset or the bottom bar's height and padding — not as part of another task,
> not as a drive-by, not because the numbers look arbitrary. They were tuned
> one pixel at a time against a real phone and the owner has signed off.
>
> | Thing | Where | Value |
> | --- | --- | --- |
> | Composer vertical offset | `--phone-pane-nudge` in `src/app/globals.css` | **120px** |
> | Footer height floor | `min-h-[3.5rem]` in `src/components/layout/bottom-nav.tsx` | 3.5rem |
> | Footer bottom padding | `pb-[min(env(safe-area-inset-bottom,0px),18px)]` | 18px cap |
>
> If something about the chat layout genuinely breaks, **stop and ask the owner**
> — do not adjust these values to compensate.

## Why the numbers look strange

The Comunicación pane is sized from `100dvh`, and the phone footer is `fixed`
(so it is not in its flow). The relationship between them does not reduce to a
clean formula on a real device: `100dvh` is measured against the layout viewport,
which is taller than the visible one once the browser chrome and home indicator
are accounted for.

So `--phone-pane-nudge` accumulated by hand, 1–30px at a time, until the composer
sat where the owner wanted it on a real phone. **120px is not a bug and not an
estimate** — it is the result of that tuning, and anything that recomputes it from
first principles will move the composer away from the position that was approved.

## What previously went wrong here

This surface was churned about a dozen times by agents editing it blind:

- Hard-coded margins (`mb-[67px]`), paint-only nudges (`translate-y-[2px]`), and
  a fixed `h-` on the footer that fought its content.
- Several rounds where the dev server served **stale CSS**, so a change appeared
  to do nothing and the next attempt compensated for a value that was never live.
  **If a layout change seems to have no effect, restart the dev server before
  concluding the code is wrong.**

## If you must verify (not change)

```powershell
# Then read the CSS the browser ACTUALLY receives, not just the source file:
#   --phone-pane-nudge should read 120px
# and measure the gap between the composer bar and the footer
node scripts/probe-gap.mjs
```

The probes in `scripts/` are read-only diagnostics. They exist so this surface can
be checked without editing it.
