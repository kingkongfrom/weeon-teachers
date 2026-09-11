import { Skeleton } from "@/components/ui/skeleton";

export default function StudentDetailLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-4 w-16" />
      </div>

      <Skeleton className="h-9 w-32 rounded-lg" />

      <div className="overflow-hidden rounded-2xl border border-border bg-surface">
        <div className="flex items-center gap-4 px-5 py-3">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-t border-border/60 px-5 py-3">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-14" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
