import { Skeleton } from "@/components/ui/skeleton";

export default function InicioLoading() {
  return (
    <div className="flex flex-col gap-10 py-2">
      <div className="flex flex-col gap-10 morning-compact:grid morning-compact:grid-cols-[auto_minmax(0,1fr)] morning-compact:gap-x-6 morning-compact:gap-y-6 morning-desktop:block">
        <div className="flex flex-col">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="mt-2 h-[5.5rem] w-28 rounded-2xl morning-compact:h-[4.43rem] morning-compact:w-24 morning-desktop:h-[7.5rem] morning-desktop:w-36" />
          <Skeleton className="mt-2 h-6 w-36" />
        </div>

        <div className="flex flex-wrap justify-center gap-2 morning-compact:mt-[90px]">
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={`quick-${index}`} className="h-9 w-36 rounded-full" />
          ))}
        </div>

        <div className="morning-compact:col-span-2 morning-desktop:mt-16">
          <Skeleton className="mx-auto mb-3 h-4 w-16" />
          <div className="flex flex-wrap justify-center gap-3">
            {Array.from({ length: 4 }, (_, index) => (
              <div
                key={index}
                className="flex h-32 min-w-[12rem] flex-1 flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-[#F4F8FC] dark:bg-[#1D243B]"
              >
                <Skeleton className="h-9 w-9 rounded-xl" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-border-strong pt-5 morning-compact:col-span-2">
          <div className="grid grid-cols-5 gap-2 morning-compact:gap-3">
            {Array.from({ length: 5 }, (_, index) => (
              <div key={index} className="flex flex-col gap-2 py-2">
                <Skeleton className="h-4 w-12 morning-compact:h-5 morning-compact:w-14" />
                <Skeleton className="h-7 w-8 morning-compact:h-8 morning-compact:w-10" />
                <Skeleton className="mt-1 h-3 w-full" />
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {Array.from({ length: 2 }, (_, index) => (
              <Skeleton key={`comms-${index}`} className="h-9 w-28 rounded-xl" />
            ))}
          </div>
        </div>

        <div className="morning-compact:col-span-2">
          <Skeleton className="mb-3 h-6 w-16" />
          <div className="flex flex-col gap-2">
            {Array.from({ length: 3 }, (_, index) => (
              <Skeleton key={`lesson-${index}`} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        </div>
      </div>

      <Skeleton className="h-11 w-full rounded-2xl" />
    </div>
  );
}
