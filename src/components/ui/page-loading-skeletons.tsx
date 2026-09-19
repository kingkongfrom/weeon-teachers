import { Skeleton } from "@/components/ui/skeleton";

/** Back control row used on drill-down screens. */
export function BackLinkSkeleton() {
  return <Skeleton className="h-9 w-28 rounded-lg" />;
}

/** Title + optional subtitle block (hub pages). */
export function PageTitleBlockSkeleton({
  titleClass = "h-9 w-52",
  subtitleClass = "h-4 w-32",
}: {
  titleClass?: string;
  subtitleClass?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <Skeleton className={titleClass} />
      <Skeleton className={subtitleClass} />
    </div>
  );
}

/** Matches {@link HubModuleCard} tone tile anatomy. */
export function HubModuleCardSkeleton() {
  return (
    <div className="flex h-full min-h-[8.25rem] flex-col gap-2.5 rounded-2xl border border-border bg-surface p-5 sm:min-h-[9.25rem] sm:gap-3">
      <Skeleton className="h-11 w-11 shrink-0 rounded-xl" />
      <div className="mt-auto min-w-0 space-y-2">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-4 w-full max-w-[14rem]" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  );
}

/** Right column on Inicio — today + upcoming lessons panel. */
export function ScheduleUpcomingPanelSkeleton() {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-border bg-surface p-5 sm:p-6">
      <Skeleton className="h-5 w-44" />
      <Skeleton className="mt-1 h-4 w-28" />
      <div className="mt-5 flex flex-col gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border/70 bg-background/40 p-3.5">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="mt-2 h-4 w-full" />
            <Skeleton className="mt-1.5 h-3 w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Calificaciones · Asistencia · Conducta pills on grupo detail. */
export function GrupoSectionTabsSkeleton() {
  return (
    <div className="flex flex-wrap gap-2">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-9 w-[7.5rem] rounded-full" />
      ))}
    </div>
  );
}

/** Week prev/next + label + “this week” control. */
export function WeekNavigatorSkeleton() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-3 sm:px-4">
      <div className="flex items-center gap-2">
        <Skeleton className="h-9 w-9 rounded-lg" />
        <Skeleton className="h-9 w-9 rounded-lg" />
        <Skeleton className="ml-1 h-6 w-40" />
      </div>
      <Skeleton className="h-9 w-28 rounded-full" />
    </div>
  );
}

/** Mensajes mailbox — standalone thread cards. */
export function MailboxThreadCardsSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-2.5">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-border bg-surface px-4 py-3.5">
          <div className="flex items-center gap-2">
            <Skeleton className="h-2 w-2 rounded-full" />
            <Skeleton className="h-4 w-36" />
            <Skeleton className="ml-auto h-3 w-12" />
          </div>
          <Skeleton className="mt-2 h-3.5 w-48" />
          <Skeleton className="mt-1 h-3 w-56 max-w-full" />
        </div>
      ))}
    </div>
  );
}

/** Student transcript hero + stat tiles. */
export function StudentGradesHeroSkeleton() {
  return (
    <>
      <div className="rounded-3xl border border-border bg-surface p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <Skeleton className="h-16 w-16 shrink-0 rounded-2xl" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-8 w-56 max-w-full" />
            <Skeleton className="h-5 w-24 rounded-full" />
          </div>
          <Skeleton className="h-14 w-14 shrink-0 rounded-full" />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-border bg-surface p-4">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="mt-2 h-7 w-12" />
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-24 rounded-full" />
        ))}
      </div>
    </>
  );
}
