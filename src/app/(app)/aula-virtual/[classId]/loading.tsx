import { Skeleton } from "@/components/ui/skeleton";
import { BackLinkSkeleton } from "@/components/ui/page-loading-skeletons";

export default function AulaVirtualClassLoading() {
  return (
    <div className="flex min-w-0 flex-col gap-5">
      <BackLinkSkeleton />

      <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-brand-600/20 to-brand-400/10 p-5 sm:p-6">
        <Skeleton className="h-7 w-56 max-w-full" />
        <Skeleton className="mt-2 h-4 w-40" />
        <Skeleton className="mt-3 h-4 w-28" />
      </div>

      <div className="flex gap-1 border-b border-border pb-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-28 rounded-t-lg" />
        ))}
      </div>

      <div className="flex flex-col gap-4">
        <Skeleton className="h-12 w-full rounded-xl" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-border bg-surface p-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-9 w-9 rounded-full" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
            <Skeleton className="mt-3 h-4 w-full" />
            <Skeleton className="mt-2 h-4 w-4/5 max-w-md" />
          </div>
        ))}
      </div>
    </div>
  );
}
