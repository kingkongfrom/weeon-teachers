import { Skeleton } from "@/components/ui/skeleton";

// Mirrors the gradebook geometry for names + exam columns + Promedio. The exact
// width varies with the longest name and number of exams; this approximates it
// so the skeleton feels like the real table while it loads.
const HEADER_HEIGHT = 40;
const ROW_HEIGHT = 36;
const ROWS = 15;

export default function GrupoDetailLoading() {
  return (
    <div className="flex flex-col gap-5">
      <Skeleton className="h-5 w-36" />

      {/* Class pills */}
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-24 rounded-full" />
        ))}
      </div>

      {/* Subject pills */}
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-7 w-28 rounded-full" />
        ))}
      </div>

      <div className="flex items-baseline gap-3">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-4 w-20" />
      </div>

      {/* Grade table — name + exam slots + Promedio */}
      <div className="w-fit overflow-hidden rounded-2xl rounded-tr-none border border-border">
        <div
          className="grid bg-surface"
          style={{ gridTemplateColumns: "224px 88px 88px 96px", blockSize: HEADER_HEIGHT }}
        >
          <div className="flex items-center px-3">
            <Skeleton className="h-4 w-24" />
          </div>
          <div className="flex items-center justify-center border-l border-border/60">
            <Skeleton className="h-4 w-12" />
          </div>
          <div className="flex items-center justify-center border-l border-border/60">
            <Skeleton className="h-4 w-12" />
          </div>
          <div className="flex items-center justify-center border-l border-border/60">
            <Skeleton className="h-4 w-12" />
          </div>
        </div>
        {Array.from({ length: ROWS }).map((_, i) => (
          <div
            key={i}
            className="grid border-t border-border/60 bg-surface"
            style={{ gridTemplateColumns: "224px 88px 88px 96px", blockSize: ROW_HEIGHT }}
          >
            <div className="flex items-center px-3">
              <Skeleton className="h-4 w-40" />
            </div>
            <div className="flex items-center justify-center border-l border-border/60" />
            <div className="flex items-center justify-center border-l border-border/60" />
            <div className="flex items-center justify-center border-l border-border/60">
              <Skeleton className="h-4 w-10" />
            </div>
          </div>
        ))}
      </div>

      {/* Summary strip */}
      <div className="grid w-fit grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-surface px-3.5 py-2.5">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="mt-1.5 h-5 w-12" />
            <Skeleton className="mt-1 h-3 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}
