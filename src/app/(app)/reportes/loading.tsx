import { Skeleton } from "@/components/ui/skeleton";

export default function ReportesLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-56" />
      </div>

      <div className="flex flex-col gap-5">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="w-fit overflow-hidden rounded-2xl border border-border bg-surface">
            <div className="flex items-center gap-3 border-b border-border bg-background px-5 py-3">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-4 w-20" />
            </div>
            <div className="p-5">
              {Array.from({ length: 6 }).map((__, j) => (
                <div key={j} className="flex items-center gap-6 border-b border-border/60 py-3">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-4 w-10" />
                  <Skeleton className="h-4 w-10" />
                  <Skeleton className="h-4 w-12" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
