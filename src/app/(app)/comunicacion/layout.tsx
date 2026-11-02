import type { ReactNode } from "react";

/**
 * Comunicación runs edge to edge: it cancels the shell gutters on every side
 * so the mail, chat and circulares panes meet the header and the viewport
 * edges. Height is pinned to the viewport so each workspace fills exactly the
 * space under the header.
 */
export default function ComunicacionLayout({ children }: { children: ReactNode }) {
  return (
    <div className="-mx-4 -mt-6 h-[calc(100dvh-4rem)] w-[calc(100%+2rem)] max-w-none sm:-mx-5 sm:w-[calc(100%+2.5rem)] md:-mx-8 md:-mt-8 md:h-[calc(100dvh-8.5rem)] md:w-[calc(100%+4rem)]">
      {children}
    </div>
  );
}
