import { Skeleton } from "@/components/ui/skeleton";
import { BackLinkSkeleton } from "@/components/ui/page-loading-skeletons";

export default function NewMessageLoading() {
  return (
    <div className="flex flex-col gap-6">
      <BackLinkSkeleton />
      <div className="flex flex-col gap-1">
        <Skeleton className="h-9 w-40 sm:h-10" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>

      <div className="flex flex-col gap-5">
        <div className="flex gap-2">
          <Skeleton className="h-10 w-32 rounded-full" />
          <Skeleton className="h-10 w-28 rounded-full" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-9 w-36 rounded-full" />
          <Skeleton className="h-9 w-28 rounded-full" />
          <Skeleton className="h-9 w-9 rounded-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-10 w-full rounded-xl" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
        <Skeleton className="h-24 w-full rounded-2xl border border-dashed border-border" />
        <div className="flex justify-end">
          <Skeleton className="h-10 w-28 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
