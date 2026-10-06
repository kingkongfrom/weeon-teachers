import {
  GrupoCardSkeleton,
  PageHeaderSkeleton,
} from "@/components/ui/page-loading-skeletons";

export default function GruposLoading() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeaderSkeleton />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <GrupoCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
