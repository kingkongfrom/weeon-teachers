import { HubModuleCardSkeleton, PageHeaderSkeleton } from "@/components/ui/page-loading-skeletons";

export default function AgendaLoading() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeaderSkeleton />
      <div className="grid auto-rows-fr gap-4 sm:grid-cols-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <HubModuleCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
