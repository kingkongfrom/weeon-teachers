import { Skeleton } from "@/components/ui/skeleton";
import { PageHeaderSkeleton } from "@/components/ui/page-loading-skeletons";

/**
 * Mis evaluaciones — hero, toolbar, then collection sections of cards.
 *
 * Mirrors the real page's shape: the brand-gradient hero (rendered as a flat
 * block of the same height, not a coloured one — a skeleton should read as
 * "loading", not as content), the toolbar, and a 3-up card grid.
 */
export default function MisEvaluacionesLoading() {
  return (
    <div
      className="flex flex-col gap-5 pb-6 md:pb-0"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <PageHeaderSkeleton />

      {/* Hero */}
      <div className="rounded-2xl border border-border bg-surface p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-3 w-56" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-36 rounded-full" />
            <Skeleton className="h-9 w-32 rounded-full" />
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-3">
        <Skeleton className="h-9 w-56 rounded-full" />
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Skeleton className="h-10 flex-1 rounded-full" />
          <Skeleton className="h-10 w-40 rounded-full" />
        </div>
        <div className="flex gap-4 border-t border-border/70 pt-2.5">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>

      {/* Collection + cards */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-6 w-16" />
        </div>
        <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="flex h-[132px] flex-col gap-2.5 rounded-xl border border-border bg-surface p-3 pt-3.5"
            >
              <Skeleton className="h-4 w-20 rounded-md" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-32" />
              <Skeleton className="mt-auto h-3 w-24" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
