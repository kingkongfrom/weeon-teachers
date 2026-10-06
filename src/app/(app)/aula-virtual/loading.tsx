import { Skeleton } from "@/components/ui/skeleton";
import {
  ClassCardSkeleton,
  PageHeaderSkeleton,
} from "@/components/ui/page-loading-skeletons";

export default function AulaVirtualLoading() {
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <PageHeaderSkeleton />

      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-7 w-24" />
          <Skeleton className="h-9 w-32 rounded-lg" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <ClassCardSkeleton key={i} />
          ))}
        </div>
      </section>
    </div>
  );
}
