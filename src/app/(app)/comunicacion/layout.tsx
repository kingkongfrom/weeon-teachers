import type { ReactNode } from "react";

/**
 * Comunicación runs edge to edge: it cancels the shell gutters on every side
 * so the mail, chat and circulares panes meet the header and the viewport
 * edges.
 *
 * HEIGHT — the phone bottom bar comes out of it, with a correction.
 *
 * The footer is `fixed`, so it is NOT in the flow: a pane sized `100dvh -
 * header` extends underneath it and its last element is hidden behind the bar.
 * Subtracting the footer fixed that. But the result still left the composer
 * ~30px ABOVE the bar, because `100dvh` on a phone browser is measured against
 * the layout viewport, which is taller than the visible one once the URL bar
 * and home indicator are accounted for — the difference the footer already
 * absorbs from below.
 *
 * `--phone-pane-nudge` is that correction, in one named place, applied only on
 * phones. It makes the pane 30px TALLER (subtracting a negative), which moves
 * everything pinned to its bottom — the composer — down onto the bar.
 *
 * Above `md` the footer does not exist (`md:hidden`) and none of this applies, so
 * the height is cancelled back to plain `100dvh - 4rem`.
 */
export default function ComunicacionLayout({ children }: { children: ReactNode }) {
  return (
    <div className="comms-fill -mx-4 -mt-[4px] h-[calc(100dvh-4rem-var(--phone-nav-height)+var(--phone-pane-nudge)-env(safe-area-inset-bottom,0px))] w-[calc(100%+2rem)] max-w-none sm:-mx-5 sm:w-[calc(100%+2.5rem)] md:-mx-8 md:-mt-8 md:h-[calc(100dvh-4rem)] md:w-[calc(100%+4rem)]">
      {children}
    </div>
  );
}
