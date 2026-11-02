import { Skeleton } from "@/components/ui/skeleton";
import { PageHeaderSkeleton } from "@/components/ui/page-loading-skeletons";

export default function ReportesLoading() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeaderSkeleton />

      <div className="overflow-hidden sm:rounded-2xl sm:border sm:border-border sm:bg-surface sm:shadow-sm">
        <div className="border-b border-border/70 px-1 py-3 sm:px-5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="mt-2 h-3 w-56 max-w-full" />
        </div>

        <div className="hidden overflow-x-auto sm:block">
          <div className="flex items-center gap-3 border-b border-border/70 px-5 py-2.5">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-20" />
            <Skeleton className="ml-auto h-3 w-14" />
            <Skeleton className="h-3 w-16" />
          </div>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 border-b border-border/60 px-5 py-2.5 last:border-b-0">
              <Skeleton className="h-4 w-10" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="ml-auto h-4 w-10" />
              <Skeleton className="h-8 w-16 rounded-lg" />
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-2.5 pb-2.5 sm:hidden">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="mx-1.5 rounded-2xl border border-border/70 bg-surface px-3 pt-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-44 max-w-full" />
                </div>
                <div className="shrink-0 space-y-1.5">
                  <Skeleton className="h-5 w-14" />
                  <Skeleton className="h-2.5 w-16" />
                </div>
              </div>
              <div className="mt-2.5 flex justify-end border-t border-border/50 px-2 py-2">
                <Skeleton className="h-8 w-16 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
