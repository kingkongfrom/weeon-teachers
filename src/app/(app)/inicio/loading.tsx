import { Skeleton } from "@/components/ui/skeleton";

export default function InicioLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <Skeleton className="h-9 w-52" />
        <Skeleton className="h-4 w-32" />
      </div>

      {/* Panel cards — 2×2 */}
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="flex h-full flex-col rounded-2xl bg-surface p-5"
          >
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
              <Skeleton className="h-6 w-32" />
            </div>
            <Skeleton className="mt-3 h-4 w-full" />
            <div className="mt-auto pt-5">
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        ))}
      </div>

      {/* Weekly schedule */}
      <section className="flex flex-col gap-3">
        <Skeleton className="h-6 w-52" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, day) => (
            <div
              key={day}
              className="flex flex-col gap-3 rounded-2xl bg-surface p-4"
            >
              <Skeleton className="h-4 w-16" />
              {Array.from({ length: day === 2 ? 1 : 2 }).map((_, lesson) => (
                <Skeleton key={lesson} className="h-14 w-full rounded-xl" />
              ))}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
