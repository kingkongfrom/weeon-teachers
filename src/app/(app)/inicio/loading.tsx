import { Skeleton } from "@/components/ui/skeleton";

/**
 * `/inicio` — mirrors `TeacherMorning`: period + attention on the right, the
 * date/weather hero on the left, quick links, access cards, the week strip and
 * the today list. The negative offsets match the real sheet so the swap from
 * skeleton to content does not move anything.
 */
export default function InicioLoading() {
  return (
    <div className="flex w-full max-w-none flex-col gap-6">
      <div
        className="relative flex w-full flex-col gap-10 py-2 morning-tablet:grid morning-tablet:grid-cols-[auto_1fr] morning-tablet:items-start morning-tablet:gap-x-6 morning-compact:-mt-5 morning-compact:grid morning-compact:grid-cols-[auto_minmax(0,1fr)] morning-compact:items-start morning-compact:gap-x-6 morning-compact:gap-y-6 morning-desktop:block morning-desktop:min-h-[70vh] morning-desktop:py-4"
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <div className="flex max-sm:-mt-[15px] flex-col items-end gap-2 morning-tablet:col-start-2 morning-tablet:row-start-1 morning-tablet:self-start morning-tablet:justify-self-end morning-compact:col-start-2 morning-compact:row-start-1 morning-compact:self-start morning-compact:justify-self-end morning-desktop:absolute morning-desktop:right-0 morning-desktop:top-0 morning-desktop:w-[26rem]">
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-12 w-full max-w-[26rem] rounded-2xl" />
        </div>

        <header className="max-sm:-mt-[60px] morning-tablet:col-start-1 morning-tablet:row-start-1 morning-tablet:self-start morning-compact:col-start-1 morning-compact:row-start-1 morning-compact:-mt-[50px] morning-desktop:-mt-[10px]">
          <div className="flex flex-col">
            <Skeleton className="h-4 w-24" />
            <div className="flex items-center gap-3">
              <Skeleton className="mt-2 h-[4rem] w-20 rounded-2xl morning-tablet:h-[5.5rem] morning-tablet:w-24 morning-compact:h-[4.43rem] morning-compact:w-20 morning-desktop:h-[7.5rem] morning-desktop:w-32" />
              <Skeleton className="mt-2 h-12 w-28 rounded-xl" />
            </div>
            <Skeleton className="mt-2 h-6 w-40" />
            <Skeleton className="mt-1 h-4 w-24" />
          </div>
        </header>

        <div className="flex w-full flex-col items-center gap-2 morning-tablet:col-span-2 morning-tablet:row-start-2 morning-tablet:justify-self-center morning-compact:col-start-1 morning-compact:col-span-2 morning-compact:row-start-2 morning-compact:-mt-[50px] morning-compact:w-full morning-compact:justify-self-center morning-compact:self-start morning-desktop:absolute morning-desktop:left-1/2 morning-desktop:top-[calc(50%+70px-50px-6rem-70px-20px-3rem-4rem)] morning-desktop:-translate-x-1/2">
          <div className="flex flex-wrap items-center justify-center gap-2">
            {Array.from({ length: 2 }, (_, index) => (
              <Skeleton key={`quick-${index}`} className="h-9 w-36 rounded-full" />
            ))}
          </div>
        </div>

        <div className="morning-tablet:col-span-2 morning-tablet:row-start-3 morning-compact:col-start-1 morning-compact:col-span-2 morning-compact:row-start-3 morning-compact:-mt-5 morning-compact:min-w-0 morning-compact:self-center morning-desktop:absolute morning-desktop:left-1/2 morning-desktop:top-[calc(50%+70px-50px-6rem-70px-20px-3rem)] morning-desktop:-translate-x-1/2">
          <Skeleton className="mx-auto mb-3 h-4 w-16" />
          <div className="flex flex-wrap justify-center gap-3 morning-tablet:flex-nowrap morning-compact:flex-nowrap morning-desktop:flex-nowrap">
            {Array.from({ length: 3 }, (_, index) => (
              <div
                key={index}
                className="flex min-w-0 flex-1 flex-col items-center justify-center gap-2 rounded-2xl bg-[#5e25cc]/[0.06] px-2 py-4 morning-tablet:gap-3 morning-tablet:px-3 morning-tablet:py-7 morning-compact:px-3 morning-compact:py-7 morning-desktop:flex-none morning-desktop:min-w-[12rem] morning-desktop:px-6 morning-desktop:py-8 dark:bg-[#1D243B]"
              >
                <Skeleton className="h-8 w-8 rounded-xl morning-tablet:h-11 morning-tablet:w-11 morning-compact:h-11 morning-compact:w-11 morning-desktop:h-9 morning-desktop:w-9" />
                <Skeleton className="h-3 w-14 morning-desktop:h-4 morning-desktop:w-20" />
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-border-strong pt-5 morning-compact:pt-4 morning-tablet:col-span-2 morning-tablet:row-start-4 morning-compact:col-span-2 morning-compact:row-start-4 morning-desktop:absolute morning-desktop:left-1/2 morning-desktop:top-[calc(50%+70px)] morning-desktop:w-2/3 morning-desktop:-translate-x-1/2 morning-desktop:-translate-y-1/2">
          <ol className="grid grid-cols-5 gap-1 gap-x-1.5 min-[380px]:gap-2 morning-compact:gap-3">
            {Array.from({ length: 5 }, (_, index) => (
              <li key={index} className="flex min-w-0 flex-col gap-2 rounded-xl border border-border bg-surface px-1 py-2 morning-compact:px-2">
                <Skeleton className="h-3 w-10" />
                <Skeleton className="h-6 w-5" />
                <Skeleton className="h-2.5 w-8" />
              </li>
            ))}
          </ol>
        </div>

        <div className="morning-tablet:col-span-2 morning-tablet:row-start-5 morning-compact:col-span-2 morning-compact:row-start-5 morning-desktop:absolute morning-desktop:left-1/2 morning-desktop:top-[calc(50%+70px+5rem+20px+30px+1rem)] morning-desktop:w-full morning-desktop:max-w-3xl morning-desktop:-translate-x-1/2">
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-3 w-24" />
          </div>
          <div className="flex flex-col gap-2">
            {Array.from({ length: 3 }, (_, index) => (
              <Skeleton key={`lesson-${index}`} className="h-[68px] w-full rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
