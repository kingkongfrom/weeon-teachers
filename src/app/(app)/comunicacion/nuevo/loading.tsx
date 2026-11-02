import { Skeleton } from "@/components/ui/skeleton";

export default function NewMessageLoading() {
  return (
    <div
      className="min-h-[calc(100vh-8rem)] bg-surface px-[10px]"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex flex-wrap items-center gap-2 border-b border-border/60 py-2.5">
        <Skeleton className="h-9 w-9 rounded-lg" />
        <Skeleton className="h-9 w-9 rounded-lg" />
        <Skeleton className="h-9 w-9 rounded-lg" />
        <div className="flex flex-1 justify-end gap-2">
          <Skeleton className="h-9 w-24 rounded-full" />
        </div>
      </div>
      <div className="flex flex-col">
        <div className="flex h-9 items-center gap-2 border-b border-border/45">
          <Skeleton className="h-3 w-10" />
          <Skeleton className="h-3 w-40 max-w-full" />
        </div>
        <div className="flex h-9 items-center gap-2 border-b border-border/45">
          <Skeleton className="h-3 w-10" />
          <Skeleton className="h-3 w-24" />
        </div>
        <div className="flex h-[16rem] flex-col gap-2 py-3">
          <Skeleton className="h-3 w-full max-w-sm" />
          <Skeleton className="h-3 w-4/5 max-w-xs" />
        </div>
      </div>
    </div>
  );
}
