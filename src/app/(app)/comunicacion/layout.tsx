import type { ReactNode } from "react";

/**
 * Comunicación runs edge to edge: it cancels the shell gutters on every side
 * so the mail, chat and circulares panes meet the header and the viewport
 * edges.
 *
 * HEIGHT — two independent corrections, one per viewport class.
 *
 * PHONE (below `md`): the footer is `fixed`, so it is NOT in the flow and a pane
 * sized `100dvh - header` runs underneath it. The footer's height is subtracted,
 * then `--phone-pane-nudge` is added back because `100dvh` is measured against
 * the layout viewport — taller than the visible one once the URL bar and home
 * indicator are accounted for. That token is tuned to the pixel on a real phone;
 * do not reuse it here.
 *
 * TABLET / DESKTOP (`md:` and up): there is no footer (`md:hidden`), so the
 * phone maths does not apply at all. The pane keeps `100dvh - 4rem`, and
 * `--tablet-pane-nudge` shifts it DOWN to clear the shell header. The two
 * tokens are separate on purpose: tuning one must never move the other.
 */
export default function ComunicacionLayout({ children }: { children: ReactNode }) {
  return (
    <div className="comms-fill -mx-4 -mt-[4px] h-[calc(100dvh-4rem-var(--phone-nav-height)+var(--phone-pane-nudge)-env(safe-area-inset-bottom,0px))] w-[calc(100%+2rem)] max-w-none sm:-mx-5 sm:w-[calc(100%+2.5rem)] md:-mx-8 md:-mt-8 md:h-[calc(100dvh-4rem-var(--tablet-pane-nudge))] md:w-[calc(100%+4rem)]">
      {children}
    </div>
  );
}
