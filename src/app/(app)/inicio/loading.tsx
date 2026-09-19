import { Skeleton } from "@/components/ui/skeleton";
import {
  HubModuleCardSkeleton,
  PageTitleBlockSkeleton,
  ScheduleUpcomingPanelSkeleton,
} from "@/components/ui/page-loading-skeletons";

export default function InicioLoading() {
  return (
    <div className="flex flex-col gap-6">
      <PageTitleBlockSkeleton />

      <Skeleton className="h-11 w-full rounded-2xl" />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-stretch lg:gap-10">
        <div className="grid auto-rows-fr gap-4 sm:grid-cols-2 sm:gap-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <HubModuleCardSkeleton key={i} />
          ))}
        </div>
        <ScheduleUpcomingPanelSkeleton />
      </div>
    </div>
  );
}
