import { Skeleton } from "@/components/ui/skeleton";

// Mirrors the GradebookWorkspace matrix: sticky student column, type-labelled
// grade columns, and a FINAL column.
const GRID_COLUMNS = "40px 208px repeat(5, 76px) 84px";
const COLUMNS = 5;
const ROWS = 9;

export default function GrupoDetailLoading() {
  return (
    <div className="flex flex-col gap-5">
      <Skeleton className="h-9 w-40 rounded-lg" />

      {/* Header + toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-9 w-28 rounded-full" />
          <Skeleton className="h-9 w-28 rounded-full" />
          <Skeleton className="h-9 w-44 rounded-full" />
          <Skeleton className="h-9 w-32 rounded-full" />
        </div>
      </div>

      {/* Subject pills */}
      <div className="flex gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-24 rounded-full" />
        ))}
      </div>

      {/* Search + legend */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Skeleton className="h-9 w-60 rounded-full" />
        <div className="flex items-center gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-3 w-16" />
          ))}
        </div>
      </div>

      {/* Matrix */}
      <div className="overflow-hidden rounded-2xl border border-border bg-surface">
        <div
          className="grid border-b border-border bg-surface"
          style={{ gridTemplateColumns: GRID_COLUMNS }}
        >
          <div className="px-2 py-3" />
          <div className="flex items-center border-l border-border px-3 py-3">
            <Skeleton className="h-3.5 w-24" />
          </div>
          {Array.from({ length: COLUMNS }).map((_, i) => (
            <div
              key={i}
              className="flex flex-col items-center gap-1.5 border-l border-border px-1 py-2"
            >
              <Skeleton className="h-4 w-14 rounded" />
              <Skeleton className="h-2.5 w-8" />
            </div>
          ))}
          <div className="flex items-center justify-center border-l border-border px-3 py-3">
            <Skeleton className="h-3.5 w-12" />
          </div>
        </div>

        {Array.from({ length: ROWS }).map((_, row) => (
          <div
            key={row}
            className="grid border-b border-border/70"
            style={{ gridTemplateColumns: GRID_COLUMNS }}
          >
            <div className="flex items-center justify-center px-2 py-2">
              <Skeleton className="h-3 w-3" />
            </div>
            <div className="flex items-center border-l border-border px-3 py-2">
              <Skeleton className="h-4 w-40" />
            </div>
            {Array.from({ length: COLUMNS }).map((_, col) => (
              <div
                key={col}
                className="flex items-center justify-center border-l border-border/60 px-1 py-2"
              >
                {col === 0 && row === 8 ? null : (
                  <Skeleton className="h-4 w-9 rounded" />
                )}
              </div>
            ))}
            <div className="flex items-center justify-center border-l border-border px-3 py-2">
              <Skeleton className="h-5 w-12 rounded-md" />
            </div>
          </div>
        ))}

        <div
          className="grid bg-surface-muted/50"
          style={{ gridTemplateColumns: GRID_COLUMNS }}
        >
          <div className="px-2 py-2" />
          <div className="flex items-center border-r border-border px-3 py-2">
            <Skeleton className="h-3 w-10" />
          </div>
          {Array.from({ length: COLUMNS }).map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-center border-r border-border/60 px-1 py-2"
            >
              <Skeleton className="h-4 w-10 rounded" />
            </div>
          ))}
          <div className="flex items-center justify-center border-l border-border px-3 py-2">
            <Skeleton className="h-4 w-10 rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}
