import {
  ComunicacionHubActivitySkeleton,
  ComunicacionHubChannelsSkeleton,
  PageHeaderSkeleton,
} from "@/components/ui/page-loading-skeletons";

export default function ComunicacionLoading() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeaderSkeleton />
      <ComunicacionHubChannelsSkeleton />
      <ComunicacionHubActivitySkeleton />
    </div>
  );
}
