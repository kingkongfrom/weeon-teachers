import type { ReactNode } from "react";

/**
 * Comunicación runs edge to edge: it cancels the shell gutters on every side
 * so the mail, chat and circulares panes meet the header and the viewport
 * edges.
 *
 * HEIGHT — the phone bottom bar has to come out of it.
 *
 * This pane is pinned to the viewport, and the phone footer is `fixed`, so it is
 * NOT in the flow: a pane sized `100dvh - header` extends underneath the footer,
 * and its last element is hidden behind it. The composer then sat at a bottom
 * edge nobody could see, which is why nudging its margin kept appearing to fix
 * the gap and never actually did.
 *
 * So on phones the footer's height is subtracted here, once. Above `md` the
 * footer does not exist (`md:hidden`) and the subtraction would leave a dead
 * strip, so it is cancelled back to `100dvh - 4rem` at that breakpoint. The
 * safe-area inset is included because the footer reserves it too.
 */
export default function ComunicacionLayout({ children }: { children: ReactNode }) {
  return (
    <div className="comms-fill -mx-4 -mt-[4px] h-[calc(100dvh-4rem-var(--phone-nav-height)-env(safe-area-inset-bottom,0px))] w-[calc(100%+2rem)] max-w-none sm:-mx-5 sm:w-[calc(100%+2.5rem)] md:-mx-8 md:-mt-8 md:h-[calc(100dvh-4rem)] md:w-[calc(100%+4rem)]">
      {children}
    </div>
  );
}
