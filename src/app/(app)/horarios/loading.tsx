import { Skeleton } from "@/components/ui/skeleton";

export default function HorariosLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <Skeleton className="h-9 w-28 rounded-lg" />
        <Skeleton className="mt-1 h-9 w-44 sm:h-10" />
        <Skeleton className="h-4 w-56" />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-border bg-surface">
            <div className="border-b border-border bg-background px-4 py-2.5">
              <Skeleton className="h-3.5 w-16" />
            </div>
            <div className="flex flex-col gap-2 p-3">
              {Array.from({ length: 3 }).map((__, j) => (
                <Skeleton key={j} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
