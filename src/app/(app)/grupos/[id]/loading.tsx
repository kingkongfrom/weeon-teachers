import { Skeleton } from "@/components/ui/skeleton";

export default function GrupoDetailLoading() {
  return (
    <div className="flex flex-col gap-5">
      <Skeleton className="h-5 w-36" />

      {/* Class pills */}
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-24 rounded-full" />
        ))}
      </div>

      {/* Subject pills */}
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-7 w-28 rounded-full" />
        ))}
      </div>

      <div className="flex items-baseline gap-3">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-4 w-20" />
      </div>

      {/* Grade table */}
      <div className="overflow-hidden rounded-2xl border border-border bg-surface">
        <div className="flex gap-4 border-b border-border px-4 py-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-24" />
          ))}
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-b border-border/60 px-4 py-3">
            <Skeleton className="h-4 w-44" />
            <Skeleton className="h-4 w-10" />
            <Skeleton className="h-4 w-10" />
            <Skeleton className="h-4 w-10" />
          </div>
        ))}
      </div>
    </div>
  );
}
