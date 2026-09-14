import { Skeleton } from "@/components/ui/skeleton";

export default function AgendaLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <Skeleton className="h-9 w-28 rounded-lg" />
        <Skeleton className="mt-1 h-9 w-40 sm:h-10" />
        <Skeleton className="h-4 w-72" />
      </div>

      <div className="grid auto-rows-fr gap-4 sm:grid-cols-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-40 w-full rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
