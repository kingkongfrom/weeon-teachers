import { Skeleton } from "@/components/ui/skeleton";

export default function AulaVirtualClassLoading() {
  return (
    <div className="flex min-w-0 flex-col gap-5">
      <Skeleton className="h-9 w-48 rounded-lg" />

      {/* Class banner */}
      <Skeleton className="h-32 w-full rounded-2xl" />

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border pb-1">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-28 rounded-t-lg" />
        ))}
      </div>

      {/* Content — assessments + materials */}
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-3">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>
        <div className="flex flex-col gap-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-14 w-full rounded-2xl" />
          <Skeleton className="h-14 w-full rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
