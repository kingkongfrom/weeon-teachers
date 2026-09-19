import { Skeleton } from "@/components/ui/skeleton";
import { BackLinkSkeleton, MailboxThreadCardsSkeleton } from "@/components/ui/page-loading-skeletons";

export default function MensajesLoading() {
  return (
    <div className="flex flex-col gap-6">
      <BackLinkSkeleton />
      <div className="flex flex-col gap-1">
        <Skeleton className="h-9 w-56 sm:h-10" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>

      <div className="flex justify-end">
        <Skeleton className="h-10 w-32 rounded-xl" />
      </div>

      <div className="grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
        <div className="flex flex-col gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded-xl" />
          ))}
        </div>
        <MailboxThreadCardsSkeleton />
      </div>
    </div>
  );
}
