import { Skeleton } from "@/components/ui/skeleton";

export default function InicioLoading() {
  return (
    <div className="flex w-full flex-col gap-6">
      <div className="relative flex w-full flex-col gap-10 py-2 morning-tablet:grid morning-tablet:grid-cols-[auto_1fr] morning-tablet:items-start morning-tablet:gap-x-6 morning-compact:-mt-5 morning-compact:grid morning-compact:grid-cols-[auto_minmax(0,1fr)] morning-compact:items-start morning-compact:gap-x-6 morning-compact:gap-y-6 morning-desktop:block morning-desktop:min-h-[70vh] morning-desktop:py-4">
        <div className="morning-tablet:col-start-2 morning-tablet:row-start-1 morning-tablet:self-start morning-tablet:justify-self-end morning-compact:col-start-2 morning-compact:row-start-1 morning-compact:self-start morning-compact:justify-self-end morning-desktop:absolute morning-desktop:right-0 morning-desktop:top-0 morning-desktop:w-[26rem]">
          <Skeleton className="h-14 w-full rounded-2xl" />
        </div>

        <header className="morning-tablet:col-start-1 morning-tablet:row-start-1 morning-tablet:self-start morning-compact:col-start-1 morning-compact:row-start-1 morning-desktop:-mt-[10px]">
          <div className="flex flex-col">
            <Skeleton className="h-4 w-24" />
            <div className="flex items-center gap-3">
              <Skeleton className="mt-2 h-[5.5rem] w-28 rounded-2xl morning-compact:h-[4.43rem] morning-compact:w-24 morning-desktop:h-[7.5rem] morning-desktop:w-36" />
              <Skeleton className="mt-2 h-10 w-24" />
            </div>
            <Skeleton className="mt-2 h-6 w-36" />
          </div>
        </header>

        <div className="hidden w-full flex-col items-center gap-2 morning-tablet:col-span-2 morning-tablet:row-start-2 morning-tablet:flex morning-tablet:justify-self-center morning-compact:col-start-1 morning-compact:col-span-2 morning-compact:row-start-2 morning-compact:-mt-[50px] morning-compact:flex morning-compact:w-full morning-compact:justify-self-center morning-compact:self-start morning-desktop:absolute morning-desktop:left-1/2 morning-desktop:top-[calc(50%+70px-50px-6rem-70px-20px-3rem-4rem)] morning-desktop:flex morning-desktop:-translate-x-1/2">
          <div className="flex flex-wrap items-center justify-center gap-2">
            {Array.from({ length: 3 }, (_, index) => (
              <Skeleton key={`quick-${index}`} className="h-9 w-36 rounded-full" />
            ))}
          </div>
        </div>

        <div className="morning-tablet:col-span-2 morning-tablet:row-start-3 morning-compact:col-start-1 morning-compact:col-span-2 morning-compact:row-start-3 morning-compact:-mt-5 morning-compact:min-w-0 morning-compact:self-center morning-desktop:absolute morning-desktop:left-1/2 morning-desktop:w-[115%] morning-desktop:max-w-none morning-desktop:top-[calc(50%+70px-50px-6rem-70px-20px-3rem)] morning-desktop:-translate-x-1/2">
          <Skeleton className="mx-auto mb-3 h-4 w-16" />
          <div className="flex flex-wrap justify-center gap-3 morning-tablet:flex-nowrap morning-compact:flex-nowrap morning-desktop:flex-nowrap">
            {Array.from({ length: 3 }, (_, index) => (
              <div
                key={index}
                className="flex min-w-[12rem] flex-col items-center justify-center gap-2 rounded-2xl border border-[#2b59ff]/25 bg-[#2b59ff]/[0.07] px-6 py-8 morning-tablet:min-w-0 morning-tablet:flex-1 morning-tablet:gap-3 morning-tablet:px-3 morning-tablet:py-7 morning-compact:min-w-0 morning-compact:flex-1 morning-compact:gap-3 morning-compact:px-3 morning-compact:py-7 dark:border-[rgba(56,100,152,0.45)] dark:bg-[#1D243B]"
              >
                <Skeleton className="h-9 w-9 rounded-xl morning-tablet:h-11 morning-tablet:w-11 morning-compact:h-11 morning-compact:w-11" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-border-strong pt-5 morning-compact:pt-4 morning-tablet:col-span-2 morning-tablet:row-start-4 morning-compact:col-span-2 morning-compact:row-start-4 morning-desktop:absolute morning-desktop:left-1/2 morning-desktop:top-[calc(50%+70px)] morning-desktop:w-2/3 morning-desktop:-translate-x-1/2 morning-desktop:-translate-y-1/2">
          <div className="grid grid-cols-5 gap-2 morning-compact:gap-3">
            {Array.from({ length: 5 }, (_, index) => (
              <div key={index} className="flex flex-col gap-2 py-2">
                <Skeleton className="h-4 w-12 morning-compact:h-5 morning-compact:w-14" />
                <Skeleton className="h-7 w-8 morning-compact:h-8 morning-compact:w-10" />
                <Skeleton className="mt-1 h-3 w-full" />
              </div>
            ))}
          </div>
          <Skeleton className="mx-auto mt-4 mb-2 h-4 w-28 morning-compact:mt-3" />
          <div className="flex flex-wrap justify-center gap-2">
            {Array.from({ length: 3 }, (_, index) => (
              <Skeleton key={`comms-${index}`} className="h-9 w-28 rounded-xl" />
            ))}
          </div>
        </div>

        <div className="morning-tablet:col-span-2 morning-tablet:row-start-5 morning-compact:col-span-2 morning-compact:row-start-5 morning-desktop:absolute morning-desktop:left-1/2 morning-desktop:top-[calc(50%+70px+5rem+20px+30px+1rem)] morning-desktop:w-full morning-desktop:max-w-3xl morning-desktop:-translate-x-1/2">
          <Skeleton className="mb-3 h-6 w-16" />
          <div className="flex flex-col gap-2">
            {Array.from({ length: 3 }, (_, index) => (
              <Skeleton key={`lesson-${index}`} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}







