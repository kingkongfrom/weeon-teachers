import { Skeleton } from "@/components/ui/skeleton";

// Mirrors the gradebook geometry for names + exam columns + Promedio. The exact
// width varies with the longest name and number of exams; this approximates it
// so the skeleton feels like the real table while it loads.
const HEADER_HEIGHT = 40;
const ROW_HEIGHT = 36;
const ROWS = 15;
const NAME_WIDTH = 224;
const EXAM_WIDTH = 88;
const AVERAGE_WIDTH = 96;
const GRID_WIDTH = NAME_WIDTH + EXAM_WIDTH * 2 + AVERAGE_WIDTH;
const GRID_COLUMNS = `${NAME_WIDTH}px ${EXAM_WIDTH}px ${EXAM_WIDTH}px ${AVERAGE_WIDTH}px`;

export default function GrupoDetailLoading() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-5 w-36" />

      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <Skeleton className="h-8 w-24 sm:h-9" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
        <Skeleton className="h-4 w-28" />

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-1 flex-wrap gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-28 rounded-full" />
            ))}
          </div>
          <Skeleton className="h-9 w-40 shrink-0 rounded-full" />
        </div>
      </header>

      <div className="w-fit" style={{ width: GRID_WIDTH }}>
        {/* Grade table — name + exam slots + Promedio */}
        <div
          className="mt-[10px] overflow-hidden rounded-2xl border border-border bg-surface"
          style={{ ["--rdg-header-height" as string]: `${HEADER_HEIGHT}px` }}
        >
          <div
            className="grid bg-surface"
            style={{
              gridTemplateColumns: GRID_COLUMNS,
              blockSize: HEADER_HEIGHT,
            }}
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
            <div className="flex items-center justify-center rounded-tr-2xl border-l border-border/60 bg-surface">
              <Skeleton className="h-4 w-16" />
            </div>
          </div>
          {Array.from({ length: ROWS }).map((_, i) => (
            <div
              key={i}
              className="grid border-t border-border/60 bg-surface"
              style={{
                gridTemplateColumns: GRID_COLUMNS,
                blockSize: ROW_HEIGHT,
              }}
            >
              <div className="flex items-center px-3">
                <Skeleton className="h-4 w-40" />
              </div>
              <div className="flex items-center justify-center border-l border-border/60" />
              <div className="flex items-center justify-center border-l border-border/60" />
              <div className="flex items-center justify-center border-l border-border/60 bg-surface-muted/35">
                <Skeleton className="h-4 w-10" />
              </div>
            </div>
          ))}
          <div
            className="flex items-center justify-center border-t border-border/60 bg-brand-600/90"
            style={{ blockSize: HEADER_HEIGHT }}
          >
            <Skeleton className="h-4 w-28 rounded-md bg-white/30" />
          </div>
        </div>

        {/* Summary strip — one bar aligned to grid width, not separate cards */}
        <div className="mt-3 flex w-full overflow-hidden rounded-xl border border-border/80 bg-surface-muted/30 shadow-sm">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className={`flex min-w-0 flex-1 flex-col gap-1.5 px-3 py-2.5 sm:px-4 sm:py-3 ${
                i > 0 ? "border-l border-border" : ""
              }`}
            >
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-5 w-12" />
              <Skeleton className="h-3 w-20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
