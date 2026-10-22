import { HubModuleCardSkeleton, PageHeaderSkeleton } from "@/components/ui/page-loading-skeletons";
import { Skeleton } from "@/components/ui/skeleton";

export default function AgendaLoading() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeaderSkeleton />
      <div className="flex flex-col gap-3 sm:gap-4">
        <div className="flex min-h-[7.5rem] items-center gap-4 rounded-3xl border border-border bg-surface p-5 sm:gap-5 sm:p-6">
          <Skeleton className="h-14 w-14 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-7 w-36" />
            <Skeleton className="h-4 w-full max-w-sm" />
          </div>
        </div>
        <div className="grid auto-rows-fr gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <HubModuleCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
