import { Skeleton } from "@/components/ui/skeleton";
import { BackLinkSkeleton, StudentGradesHeroSkeleton } from "@/components/ui/page-loading-skeletons";

export default function StudentDetailLoading() {
  return (
    <div className="flex flex-col gap-6">
      <BackLinkSkeleton />
      <StudentGradesHeroSkeleton />

      <div className="flex flex-col gap-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-2xl border border-border bg-surface">
            <div className="border-b border-border px-5 py-3">
              <Skeleton className="h-5 w-40" />
            </div>
            {Array.from({ length: 3 }).map((__, j) => (
              <div key={j} className="flex items-center gap-4 border-t border-border/60 px-5 py-3">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-4 w-14" />
                <Skeleton className="ml-auto h-5 w-20 rounded-full" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
