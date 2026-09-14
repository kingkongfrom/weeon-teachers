import { Skeleton } from "@/components/ui/skeleton";

export default function MailboxLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <Skeleton className="h-9 w-28 rounded-lg" />
        <Skeleton className="mt-1 h-9 w-56 sm:h-10" />
        <Skeleton className="h-4 w-72" />
      </div>

      <div className="grid gap-5 lg:grid-cols-[240px_minmax(0,1fr)]">
        <div className="flex flex-col gap-2">
          <Skeleton className="mb-1 h-11 w-full rounded-xl" />
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-10 w-full rounded-xl" />
        </div>

        <div className="overflow-hidden rounded-2xl border border-border bg-surface">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-1.5 border-b border-border px-4 py-3.5 last:border-b-0">
              <div className="flex items-center gap-2">
                <Skeleton className="h-3.5 w-32" />
                <Skeleton className="ml-auto h-3 w-12" />
              </div>
              <Skeleton className="h-3.5 w-48" />
              <Skeleton className="h-3 w-56" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
