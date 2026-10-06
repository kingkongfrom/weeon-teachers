import {
  ChatWorkspaceSkeleton,
  PageHeaderSkeleton,
} from "@/components/ui/page-loading-skeletons";

export default function ChatLoading() {
  return (
    <div className="flex flex-col gap-4">
      <PageHeaderSkeleton withBack />
      <ChatWorkspaceSkeleton />
    </div>
  );
}
