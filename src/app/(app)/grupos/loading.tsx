import { Skeleton } from "@/components/ui/skeleton";

export default function GruposLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-64" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-border bg-surface p-5">
            <Skeleton className="h-12 w-12 rounded-xl" />
            <Skeleton className="mt-4 h-5 w-24" />
            <Skeleton className="mt-2 h-4 w-16" />
            <Skeleton className="mt-4 h-4 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}
