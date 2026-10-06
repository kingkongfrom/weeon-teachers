import { Skeleton } from "@/components/ui/skeleton";
import {
  BackLinkSkeleton,
  HorariosUpcomingEvaluationsSkeleton,
  PageTitleBlockSkeleton,
  WeekNavigatorSkeleton,
} from "@/components/ui/page-loading-skeletons";

export default function HorariosLoading() {
  return (
    <div className="flex flex-col gap-6">
      <BackLinkSkeleton />
      <PageTitleBlockSkeleton titleClass="h-9 w-44 sm:h-10" subtitleClass="h-4 w-56" />

      <section className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
        <div className="border-b border-border px-3 py-3 sm:px-4">
          <WeekNavigatorSkeleton />
        </div>
        <div className="grid grid-cols-1 gap-4 p-4 sm:p-5 md:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex flex-col gap-3 rounded-2xl bg-surface p-4 ring-1 ring-inset ring-black/5 dark:ring-white/10"
            >
              <div className="flex items-center justify-between gap-2">
                <Skeleton className="h-6 w-16 rounded-lg" />
                <Skeleton className="h-4 w-6" />
              </div>
              <div className="flex flex-col gap-2">
                {Array.from({ length: i === 2 ? 1 : 2 }).map((__, j) => (
                  <Skeleton key={j} className="h-14 w-full rounded-xl" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <HorariosUpcomingEvaluationsSkeleton />
    </div>
  );
}
