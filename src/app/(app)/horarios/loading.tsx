import { Skeleton } from "@/components/ui/skeleton";
import { BackLinkSkeleton, WeekNavigatorSkeleton } from "@/components/ui/page-loading-skeletons";

export default function HorariosLoading() {
  return (
    <div className="flex flex-col gap-6">
      <BackLinkSkeleton />
      <div className="flex flex-col gap-1">
        <Skeleton className="h-9 w-44 sm:h-10" />
        <Skeleton className="h-4 w-56" />
      </div>

      <WeekNavigatorSkeleton />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-2xl bg-surface ring-1 ring-inset ring-border">
            <div className="border-b border-border bg-background/60 px-4 py-2.5">
              <Skeleton className="h-3.5 w-12" />
              <Skeleton className="mt-1 h-5 w-6" />
            </div>
            <div className="flex flex-col gap-2 p-3">
              {Array.from({ length: i === 2 ? 1 : 2 }).map((__, j) => (
                <Skeleton key={j} className="h-14 w-full rounded-xl" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
