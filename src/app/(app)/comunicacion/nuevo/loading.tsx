import { Skeleton } from "@/components/ui/skeleton";

/**
 * `/comunicacion/nuevo` — mirrors `UnifiedMessageComposer`.
 *
 * Kept in step with the tenants repo's `messages/nuevo/loading.tsx` on purpose:
 * both apps render the same composer, so two different skeletons for it means one
 * of them is describing a screen that no longer exists.
 *
 * The previous version drew three square icon buttons, two 36px metadata rows and a
 * 16rem bordered body. The editor has since lost its box, the body lost its
 * placeholder, the attachment strip lost its drive row and the recipient rows got
 * shorter — so the swap to real content moved everything.
 */
export default function NewMessageLoading() {
  return (
    <div
      className="h-[calc(100dvh-4rem-var(--phone-nav-height)-env(safe-area-inset-bottom,0px))] overflow-y-auto bg-surface px-[10px] pb-0 md:h-auto md:min-h-[calc(100vh-8rem)] md:overflow-visible md:pb-0"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="mx-auto w-full max-w-6xl">
        {/* Toolbar row: back, trash and save on the left; send pushed right. */}
        <div className="flex flex-wrap items-center gap-2 border-b border-border/60 py-2.5">
          <Skeleton className="h-9 w-9 rounded-full" />
          <Skeleton className="h-9 w-9 rounded-full" />
          <Skeleton className="h-9 w-9 rounded-full" />
          <div className="flex flex-1 justify-end">
            <Skeleton className="h-9 w-28 rounded-full" />
          </div>
        </div>

        {/* Subject: a label and its value on one short row. */}
        <div className="flex items-center gap-2 border-b border-border/45 py-2">
          <Skeleton className="h-3 w-12 shrink-0" />
          <Skeleton className="h-4 w-48 max-w-full" />
        </div>

        {/* Para: label plus a recipient chip, at the tightened row height. */}
        <div className="flex items-center gap-2 border-b border-border/45 py-2">
          <Skeleton className="h-3 w-10 shrink-0" />
          <Skeleton className="h-6 w-36 max-w-full rounded-md" />
        </div>

        {/* The editor: its formatting toolbar, then the writing area. Neither is
            boxed — the rule under the toolbar is the only line. */}
        <div className="mt-4">
          <div className="flex items-center gap-3 border-b border-border/60 px-1 py-1.5">
            {Array.from({ length: 8 }, (_, index) => (
              <Skeleton key={`tool-${index}`} className="h-6 w-6 rounded" />
            ))}
          </div>
          <div className="flex flex-col gap-2.5 px-3 py-3">
            <Skeleton className="h-3.5 w-full max-w-xl" />
            <Skeleton className="h-3.5 w-4/5 max-w-lg" />
            <Skeleton className="h-3.5 w-2/3 max-w-md" />
          </div>
        </div>
      </div>
    </div>
  );
}
