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
    <div className="flex h-full min-h-[8.25rem] flex-col gap-2.5 rounded-3xl border border-border bg-surface p-5 sm:min-h-[9.25rem] sm:gap-3">
      <Skeleton className="h-11 w-11 shrink-0 rounded-full" />
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

/** Matches {@link PageHeader} — optional back row + title + description. */
export function PageHeaderSkeleton({
  withBack = false,
}: {
  withBack?: boolean;
}) {
  return (
    <div className="flex flex-col gap-3">
      {withBack ? <BackLinkSkeleton /> : null}
      <PageTitleBlockSkeleton titleClass="h-9 w-52 sm:h-10" subtitleClass="h-4 w-64 max-w-full" />
    </div>
  );
}

/** Week prev/next + label + “this week” (inline — parent supplies the frame). */
export function WeekNavigatorSkeleton() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <Skeleton className="h-9 w-9 rounded-lg" />
        <Skeleton className="h-9 w-16 rounded-lg" />
        <Skeleton className="h-9 w-9 rounded-lg" />
        <Skeleton className="ml-1 h-6 w-36 sm:w-44" />
      </div>
      <Skeleton className="hidden h-9 w-28 rounded-lg sm:block" />
    </div>
  );
}

/** Aula virtual {@link ClassCard} — rounded-3xl teal-style tile. */
export function ClassCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-3xl border border-border bg-surface">
      <div className="flex items-start gap-3 px-4 py-3">
        <Skeleton className="h-11 w-11 shrink-0 rounded-full" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-3 w-10" />
        </div>
      </div>
      <div className="px-4">
        <Skeleton className="h-3 w-40" />
      </div>
      <div className="flex flex-col gap-2 px-4 pb-3 pt-3">
        <div className="flex flex-wrap gap-1.5">
          <Skeleton className="h-5 w-14 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <Skeleton className="h-3 w-24" />
      </div>
      <div className="flex justify-end gap-0.5 border-t border-border px-2 py-1.5">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-9 rounded-full" />
        ))}
      </div>
    </div>
  );
}

/** Mis grupos {@link GrupoCard} — banner + chips + actions. */
export function GrupoCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-surface">
      <div className="space-y-2 bg-surface-muted/50 px-4 py-3">
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-3 w-10" />
      </div>
      <div className="px-4 pt-3">
        <Skeleton className="h-3 w-44" />
      </div>
      <div className="flex flex-col gap-2 px-4 pb-3 pt-2">
        <div className="flex flex-wrap gap-1.5">
          <Skeleton className="h-5 w-14 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
        <Skeleton className="h-3 w-24" />
      </div>
      <div className="flex justify-end gap-0.5 border-t border-border px-2 py-1.5">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-9 rounded-full" />
        ))}
      </div>
    </div>
  );
}

/** `/aula-virtual/[classId]` hero banner. */
export function AulaClassHeroSkeleton() {
  return (
    <div className="rounded-3xl border border-border bg-teal-50/40 p-6 dark:bg-teal-950/20">
      <div className="flex items-start gap-4">
        <Skeleton className="h-12 w-12 shrink-0 rounded-full" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-9 w-48 max-w-full sm:h-10 sm:w-56" />
          <Skeleton className="h-4 w-52 max-w-full" />
          <Skeleton className="h-3 w-28" />
        </div>
      </div>
    </div>
  );
}

/** {@link ClassTabs} tab bar (5 tabs). */
export function ClassTabsBarSkeleton() {
  return (
    <div className="flex gap-1 overflow-hidden border-b border-border">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="mb-1 h-10 w-24 shrink-0 rounded-t-lg sm:w-28" />
      ))}
    </div>
  );
}

/** Stream / novedades tab — composer + post cards. */
export function ClassStreamPanelSkeleton() {
  return (
    <div className="flex flex-col gap-4 pt-5">
      <Skeleton className="h-12 w-full rounded-xl" />
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-border bg-surface p-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
          <Skeleton className="mt-3 h-4 w-full" />
          <Skeleton className="mt-2 h-4 w-4/5 max-w-md" />
        </div>
      ))}
    </div>
  );
}

/** Horarios — próximas evaluaciones block. */
export function HorariosUpcomingEvaluationsSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-5">
      <Skeleton className="h-6 w-44" />
      <Skeleton className="mt-2 h-0.5 w-10 rounded-full" />
      <div className="mt-4 flex flex-col gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}

/** `/comunicacion` channel rails (Email + Chat). */
export function ComunicacionHubChannelsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
      {Array.from({ length: 2 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-2.5 rounded-2xl border border-border bg-surface p-3 sm:gap-4 sm:p-5"
        >
          <Skeleton className="h-10 w-10 shrink-0 rounded-xl sm:h-12 sm:w-12 sm:rounded-2xl" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-5 w-20 sm:h-6 sm:w-24" />
            <Skeleton className="h-3 w-full max-w-[12rem]" />
          </div>
          <Skeleton className="hidden h-6 w-16 rounded-full min-[380px]:block" />
        </div>
      ))}
    </div>
  );
}

/** `/comunicacion` dual inbox + chat preview. */
export function ComunicacionHubActivitySkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface">
      <div className="grid grid-cols-2 divide-x divide-border">
        {Array.from({ length: 2 }).map((_, col) => (
          <div key={col} className="flex min-h-[14rem] flex-col sm:min-h-[16rem]">
            <div className="flex items-center gap-2 border-b border-border px-3 py-3 sm:px-5">
              <Skeleton className="h-8 w-8 rounded-xl" />
              <Skeleton className="h-4 w-24" />
            </div>
            <div className="flex flex-col gap-1 px-2 py-2">
              {Array.from({ length: 4 }).map((__, row) => (
                <div key={row} className="flex gap-3 rounded-xl px-2 py-2.5">
                  <Skeleton className="mt-2 h-2 w-2 shrink-0 rounded-full" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-3 w-3/4" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** {@link MessagesWorkspace} — folders + thread list + reading pane. */
export function MessagesWorkspaceSkeleton() {
  return (
    <div className="flex w-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Skeleton className="h-10 w-56 rounded-xl lg:w-48" />
        <Skeleton className="h-10 w-full max-w-md flex-1 rounded-xl" />
        <Skeleton className="h-10 w-28 rounded-xl" />
        <Skeleton className="h-10 w-10 rounded-xl" />
        <Skeleton className="h-10 w-10 rounded-xl" />
      </div>
      <div className="flex h-[calc(100dvh-8rem)] min-h-[28rem] w-full overflow-hidden rounded-2xl border border-border bg-surface">
        <div className="hidden w-56 shrink-0 flex-col gap-1 border-r border-border px-2 py-3 lg:flex">
          <Skeleton className="mx-2 mb-2 h-3 w-20" />
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full rounded-lg" />
          ))}
        </div>
        <div className="flex w-full min-w-[16rem] max-w-[22rem] shrink-0 flex-col border-r border-border">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex gap-3 border-b border-border/60 px-3 py-3">
              <Skeleton className="mt-1.5 h-2 w-2 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-4/5" />
              </div>
            </div>
          ))}
        </div>
        <div className="hidden min-w-[12rem] flex-1 flex-col gap-4 p-6 md:flex">
          <Skeleton className="h-7 w-2/3 max-w-sm" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}

/** {@link ChatWorkspace} — list + thread panes. */
export function ChatWorkspaceSkeleton() {
  return (
    <div className="flex h-[min(576px,calc(100vh-12rem))] min-h-[304px] flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
      <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(240px,280px)_minmax(0,1fr)]">
        <aside className="flex min-h-0 flex-col border-b border-border lg:border-b-0 lg:border-r">
          <div className="space-y-1.5 border-b border-border px-3 py-2">
            <Skeleton className="h-8 w-full rounded-xl" />
            <Skeleton className="h-8 w-full rounded-xl" />
            <Skeleton className="h-8 w-full rounded-xl" />
          </div>
          <div className="flex flex-col gap-1 p-1.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2 rounded-xl px-2 py-2">
                <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              </div>
            ))}
          </div>
        </aside>
        <div className="hidden min-h-0 flex-col p-4 lg:flex">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="mt-4 h-full min-h-[12rem] w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}

/** Calendario toolbar + month grid shell. */
export function CalendarioBoardSkeleton() {
  return (
    <>
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:px-4">
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-9 rounded-lg" />
          <Skeleton className="h-9 w-16 rounded-lg" />
          <Skeleton className="h-9 w-9 rounded-lg" />
          <Skeleton className="ml-1 h-6 w-40" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-8 w-44 rounded-lg" />
          <Skeleton className="h-8 w-24 rounded-lg" />
          <Skeleton className="h-8 w-36 rounded-lg" />
          <Skeleton className="h-8 w-24 rounded-lg" />
        </div>
      </div>
      <div className="overflow-hidden rounded-2xl border border-border bg-surface">
        <div className="grid grid-cols-5 border-b border-border bg-brand-50/40 px-2 py-2 dark:bg-brand-950/20">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="mx-auto h-3 w-8" />
          ))}
        </div>
        <div className="grid grid-cols-5">
          {Array.from({ length: 25 }).map((_, i) => (
            <div key={i} className="min-h-[5.5rem] border-b border-r border-border p-2 sm:min-h-[7rem]">
              <Skeleton className="h-6 w-6 rounded-md" />
              <Skeleton className="mt-2 h-3 w-full rounded" />
            </div>
          ))}
        </div>
      </div>
    </>
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
