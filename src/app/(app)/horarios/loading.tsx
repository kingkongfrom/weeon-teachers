import { Skeleton } from "@/components/ui/skeleton";
import { BackLinkSkeleton } from "@/components/ui/page-loading-skeletons";

export default function HorariosLoading() {
  return (
    <div className="flex flex-col gap-6">
      <BackLinkSkeleton />
      <div className="flex flex-col gap-1">
        <Skeleton className="h-9 w-44 sm:h-10" />
        <Skeleton className="h-4 w-56" />
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-surface">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-3 sm:px-4">
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-9 rounded-lg" />
            <Skeleton className="h-9 w-20 rounded-lg" />
            <Skeleton className="h-9 w-9 rounded-lg" />
            <Skeleton className="ml-1 h-6 w-40" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-28 rounded-full" />
            <Skeleton className="h-9 w-32 rounded-lg" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 xl:divide-x xl:divide-border">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="border-b border-border p-4 last:border-b-0 xl:border-b-0">
              <div className="mb-3 flex items-center justify-between rounded-lg bg-brand-50/50 px-2 py-2 dark:bg-brand-950/20">
                <Skeleton className="h-3 w-12" />
                <Skeleton className="h-7 w-7 rounded-lg" />
              </div>
              <div className="flex flex-col gap-2">
                {Array.from({ length: i === 2 ? 1 : 2 }).map((__, j) => (
                  <Skeleton key={j} className="h-16 w-full rounded-xl" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
