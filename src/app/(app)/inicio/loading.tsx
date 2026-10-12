import { Skeleton } from "@/components/ui/skeleton";
import {
  PageTitleBlockSkeleton,
  ScheduleUpcomingPanelSkeleton,
} from "@/components/ui/page-loading-skeletons";

export default function InicioLoading() {
  return (
    <div className="flex flex-col gap-6">
      <PageTitleBlockSkeleton />

      <Skeleton className="h-11 w-full rounded-2xl" />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-start lg:gap-10">
        <Skeleton className="mx-auto aspect-square w-full max-w-[34rem] rounded-[1.75rem]" />
        <ScheduleUpcomingPanelSkeleton />
      </div>
    </div>
  );
}
