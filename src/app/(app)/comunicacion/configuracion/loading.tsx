import { Skeleton } from "@/components/ui/skeleton";

/**
 * Mensajes → Configuración. Mirrors the real page: back link, title, subtitle and
 * the signature card.
 *
 * The card's editor is now `compact` (a short toolbar — no headings, links, quote,
 * code or alignment) and, like every rich-text field, no longer sits in a box: the
 * outer card remains, but the field inside is a toolbar rule plus the writing area.
 * The skeleton draws that shape, so the page does not jump when the settings land.
 */
export default function MensajesConfiguracionLoading() {
  return (
    <div
      className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <Skeleton className="h-5 w-24" />
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="mt-2 h-4 w-64 max-w-full" />
        {/* Compact formatting toolbar: the six controls the signature keeps. */}
        <div className="mt-4 flex items-center gap-2 border-b border-border/60 px-1 py-1.5">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={`tool-${index}`} className="h-6 w-6 rounded" />
          ))}
        </div>
        {/* Writing area, unboxed, at the same min-height the real field uses. */}
        <div className="flex min-h-[10rem] flex-col gap-2.5 px-3 py-3">
          <Skeleton className="h-3.5 w-full max-w-md" />
          <Skeleton className="h-3.5 w-3/4 max-w-sm" />
        </div>
        <div className="mt-4 flex justify-end">
          <Skeleton className="h-10 w-28 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
