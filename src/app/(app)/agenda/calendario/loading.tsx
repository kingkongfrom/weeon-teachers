import { Skeleton } from "@/components/ui/skeleton";
import { BackLinkSkeleton } from "@/components/ui/page-loading-skeletons";

export default function CalendarioLoading() {
  return (
    <div className="flex flex-col gap-6">
      <BackLinkSkeleton />
      <div className="flex flex-col gap-1">
        <Skeleton className="h-9 w-44 sm:h-10" />
        <Skeleton className="h-4 w-64 max-w-full" />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-3 sm:px-4">
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-9 rounded-lg" />
          <Skeleton className="h-9 w-16 rounded-lg" />
          <Skeleton className="h-9 w-9 rounded-lg" />
          <Skeleton className="ml-1 h-6 w-40" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-16 rounded-full" />
          ))}
          <Skeleton className="h-8 w-24 rounded-full" />
          <Skeleton className="h-9 w-44 rounded-lg" />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-surface">
        <div className="grid grid-cols-5 border-b border-border">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="m-2 h-3 rounded" />
          ))}
        </div>
        <div className="grid grid-cols-5">
          {Array.from({ length: 25 }).map((_, i) => (
            <div key={i} className="min-h-[7.25rem] border-b border-r border-border p-1.5">
              <Skeleton className="h-6 w-6 rounded-full" />
              <Skeleton className="mt-2 h-4 w-full rounded" />
              <Skeleton className="mt-1 h-4 w-3/4 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
