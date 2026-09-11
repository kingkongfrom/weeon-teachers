import { Skeleton } from "@/components/ui/skeleton";

export default function InicioLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <Skeleton className="h-8 w-44" />
        <Skeleton className="h-4 w-32" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex h-full flex-col rounded-2xl bg-surface p-5">
            <Skeleton className="h-7 w-7 rounded-lg" />
            <Skeleton className="mt-4 h-5 w-24" />
            <Skeleton className="mt-2 h-4 w-full" />
            <div className="mt-auto pt-4">
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
