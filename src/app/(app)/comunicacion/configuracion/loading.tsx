import { Skeleton } from "@/components/ui/skeleton";

/**
 * Mensajes → Configuración. Mirrors the real page: back link, title, subtitle and
 * the signature card, so the layout does not jump when the data lands.
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
        <Skeleton className="mt-4 h-28 w-full" />
        <div className="mt-4 flex justify-end gap-2">
          <Skeleton className="h-9 w-24 rounded-full" />
          <Skeleton className="h-9 w-24 rounded-full" />
        </div>
      </div>
    </div>
  );
}