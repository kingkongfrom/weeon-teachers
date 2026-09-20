import { Skeleton } from "@/components/ui/skeleton";
import { BackLinkSkeleton, GrupoSectionTabsSkeleton } from "@/components/ui/page-loading-skeletons";

// Mirrors the gradebook grid: # · student · 5 grade columns · FINAL, at the
// default (cozy) density — 40px · 216px · 5×88px · 72px.
const GRID_COLUMNS = "40px 216px repeat(5, 88px) 72px";
const COLUMNS = 5;
const ROWS = 9;

export default function GrupoDetailLoading() {
  return (
    <div className="flex flex-col gap-5">
      <BackLinkSkeleton />
      <GrupoSectionTabsSkeleton />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-9 w-28 rounded-full" />
          <Skeleton className="h-9 w-28 rounded-full" />
          <Skeleton className="h-9 w-44 rounded-full" />
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-24 shrink-0 rounded-full" />
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Skeleton className="h-9 w-60 rounded-full" />
        <div className="flex items-center gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-3 w-16" />
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-surface">
        {/* Header: group row + labels row, with # / student / FINAL spanning both */}
        <div
          className="grid border-b border-border"
          style={{ gridTemplateColumns: GRID_COLUMNS, gridTemplateRows: "36px 40px" }}
        >
          <div
            className="border-r border-border bg-surface"
            style={{ gridRow: "1 / span 2" }}
          />
          <div
            className="flex items-center border-r border-border bg-surface px-3"
            style={{ gridRow: "1 / span 2" }}
          >
            <Skeleton className="h-3.5 w-24" />
          </div>

          <div
            className="flex items-center justify-center border-l border-border bg-surface-muted"
            style={{ gridColumn: "3 / span 3", gridRow: 1 }}
          >
            <Skeleton className="h-3 w-16" />
          </div>
          <div
            className="flex items-center justify-center border-l border-border bg-surface-muted"
            style={{ gridColumn: "6 / span 2", gridRow: 1 }}
          >
            <Skeleton className="h-3 w-12" />
          </div>

          {Array.from({ length: COLUMNS }).map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-center border-l border-border bg-surface"
              style={{ gridColumn: i + 3, gridRow: 2 }}
            >
              <Skeleton className="h-3 w-10" />
            </div>
          ))}

          <div
            className="flex items-center justify-center border-l border-border bg-surface"
            style={{ gridColumn: 8, gridRow: "1 / span 2" }}
          >
            <Skeleton className="h-3.5 w-10" />
          </div>
        </div>

        {Array.from({ length: ROWS }).map((_, row) => (
          <div
            key={row}
            className="grid h-9 border-b border-border/70"
            style={{ gridTemplateColumns: GRID_COLUMNS }}
          >
            <div className="flex items-center justify-center">
              <Skeleton className="h-3 w-3" />
            </div>
            <div className="flex items-center border-l border-border px-3">
              <Skeleton className="h-4 w-40" />
            </div>
            {Array.from({ length: COLUMNS }).map((_, col) => (
              <div
                key={col}
                className="flex items-center justify-center border-l border-border/60"
              >
                {col === 0 && row === ROWS - 1 ? null : (
                  <Skeleton className="h-5 w-9 rounded-md" />
                )}
              </div>
            ))}
            <div className="flex items-center justify-center border-l border-border">
              <Skeleton className="h-5 w-9 rounded-md" />
            </div>
          </div>
        ))}

        {/* PROM. row */}
        <div
          className="grid h-10 border-t border-border bg-surface-muted"
          style={{ gridTemplateColumns: GRID_COLUMNS }}
        >
          <div className="border-r border-border" />
          <div className="flex items-center border-r border-border px-3">
            <Skeleton className="h-3 w-10" />
          </div>
          {Array.from({ length: COLUMNS }).map((_, col) => (
            <div
              key={col}
              className="flex items-center justify-center border-l border-border/60"
            >
              <Skeleton className="h-5 w-9 rounded-md" />
            </div>
          ))}
          <div className="flex items-center justify-center border-l border-border">
            <Skeleton className="h-5 w-9 rounded-md" />
          </div>
        </div>
      </div>
    </div>
  );
}
