import { Skeleton } from "@/components/ui/skeleton";
import { PageHeaderSkeleton } from "@/components/ui/page-loading-skeletons";

/**
 * Crear set de Blooket — header, the title/nivel card, then question cards.
 *
 * Mirrors the builder's real blocks so the form does not jump when it mounts:
 * a title field, the Nivel control, then two question cards and the review box.
 */
export default function BlooketLoading() {
  return (
    <div
      className="flex flex-col gap-6 pb-6 md:pb-0"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <PageHeaderSkeleton />

      <div className="rounded-2xl border border-border bg-surface p-4">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="mt-2 h-11 w-full rounded-lg" />
        <Skeleton className="mt-4 h-3 w-16" />
        <Skeleton className="mt-2 h-9 w-40 rounded-full" />
        <Skeleton className="mt-3 h-3 w-3/4" />
      </div>

      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-7 w-7 rounded-full" />
            <Skeleton className="h-10 w-48 rounded-lg" />
          </div>
          <Skeleton className="h-20 w-full rounded-lg" />
          <Skeleton className="h-11 w-full rounded-lg" />
          <Skeleton className="h-11 w-full rounded-lg" />
          <Skeleton className="h-6 w-36" />
        </div>
      ))}

      <Skeleton className="h-11 w-44 rounded-lg" />
    </div>
  );
}
