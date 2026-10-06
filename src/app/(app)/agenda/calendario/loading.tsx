import {
  BackLinkSkeleton,
  CalendarioBoardSkeleton,
  PageTitleBlockSkeleton,
} from "@/components/ui/page-loading-skeletons";

export default function CalendarioLoading() {
  return (
    <div className="flex flex-col gap-6">
      <BackLinkSkeleton />
      <PageTitleBlockSkeleton titleClass="h-9 w-44 sm:h-10" subtitleClass="h-4 w-64 max-w-full" />
      <CalendarioBoardSkeleton />
    </div>
  );
}
