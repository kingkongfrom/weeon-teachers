import { Skeleton } from "@/components/ui/skeleton";

export default function ReportesLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <Skeleton className="h-9 w-44 sm:h-10" />
        <Skeleton className="h-4 w-56" />
      </div>

      <article className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-6 w-32 rounded-full" />
          <Skeleton className="h-5 w-24 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>

        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-2xl border border-border bg-surface">
            <div className="flex items-center gap-3 border-b border-border px-4 py-3">
              <Skeleton className="h-8 w-8 rounded-lg" />
              <Skeleton className="h-5 w-36" />
              <Skeleton className="ml-auto h-5 w-16 rounded-full" />
            </div>
            <div className="space-y-2 p-4">
              {Array.from({ length: 4 }).map((__, j) => (
                <Skeleton key={j} className="h-4 w-full max-w-lg" />
              ))}
            </div>
          </div>
        ))}
      </article>
    </div>
  );
}
