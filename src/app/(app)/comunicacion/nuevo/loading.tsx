import { Skeleton } from "@/components/ui/skeleton";

export default function NewMessageLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <Skeleton className="h-9 w-28 rounded-lg" />
        <Skeleton className="mt-1 h-9 w-40 sm:h-10" />
        <Skeleton className="h-4 w-72" />
      </div>

      <div className="flex flex-col gap-5 rounded-2xl border border-border bg-surface p-5">
        <Skeleton className="h-9 w-56 rounded-full" />
        <Skeleton className="h-10 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
        <div className="flex justify-end">
          <Skeleton className="h-10 w-28 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
