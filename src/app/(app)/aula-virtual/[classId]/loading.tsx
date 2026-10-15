import {
  AulaClassHeroSkeleton,
  BackLinkSkeleton,
  ClassTabPanelSkeleton,
  ClassTabsBarSkeleton,
} from "@/components/ui/page-loading-skeletons";

export default function AulaVirtualClassLoading() {
  return (
    <div className="flex min-w-0 flex-col gap-5">
      <BackLinkSkeleton />
      <AulaClassHeroSkeleton />
      <ClassTabsBarSkeleton />
      <ClassTabPanelSkeleton />
    </div>
  );
}
