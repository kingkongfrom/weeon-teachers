import { Skeleton } from "@/components/ui/skeleton";

export default function ThreadLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <Skeleton className="h-9 w-28 rounded-lg" />
        <Skeleton className="mt-1 h-9 w-64 sm:h-10" />
        <Skeleton className="h-4 w-80" />
      </div>

      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-5">
          <Skeleton className="h-6 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>

        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-4">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-28" />
              </div>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5">
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-2xl" />
          <div className="flex justify-end">
            <Skeleton className="h-10 w-32 rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}
