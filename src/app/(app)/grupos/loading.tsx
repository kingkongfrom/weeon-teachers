import {
  GrupoRowSkeleton,
  PageHeaderSkeleton,
} from "@/components/ui/page-loading-skeletons";

export default function GruposLoading() {
  return (
    <div className="flex flex-col gap-5">
      <PageHeaderSkeleton />
      {/* Rows, matching `GrupoRow` — not the old card grid. */}
      <div className="flex flex-col gap-2.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <GrupoRowSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
