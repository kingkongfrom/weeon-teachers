import { Skeleton } from "@/components/ui/skeleton";
import { HubModuleCardSkeleton } from "@/components/ui/page-loading-skeletons";

export default function AgendaLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <Skeleton className="h-9 w-40 sm:h-10" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>

      <div className="grid auto-rows-fr gap-4 sm:grid-cols-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <HubModuleCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
