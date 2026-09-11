import { Skeleton } from "@/components/ui/skeleton";

export default function EstudiantesLoading() {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <Skeleton className="h-9 w-28 rounded-lg" />
        <Skeleton className="mt-1 h-9 w-44 sm:h-10" />
        <Skeleton className="h-4 w-56" />
      </header>

      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <Skeleton className="h-9 w-64 max-w-full rounded-lg" />
          <Skeleton className="h-9 w-36 rounded-lg" />
          <Skeleton className="h-9 w-28 rounded-lg" />
        </div>

        <div className="max-w-fit overflow-x-auto rounded-2xl border border-border bg-surface">
          <table className="text-sm">
            <thead>
              <tr className="border-b border-border bg-background text-left text-xs uppercase tracking-wide text-foreground/50">
                <th className="w-12 px-4 py-3 font-medium">
                  <Skeleton className="h-3 w-3" />
                </th>
                <th className="px-4 py-3 font-medium">
                  <Skeleton className="h-3 w-20" />
                </th>
                <th className="px-4 py-3 font-medium">
                  <Skeleton className="h-3 w-12" />
                </th>
                <th className="px-4 py-3 text-right font-medium">
                  <Skeleton className="ml-auto h-3 w-10" />
                </th>
                <th className="px-4 py-3 font-medium">
                  <Skeleton className="h-3 w-14" />
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className={i % 2 === 1 ? "bg-surface-muted/30" : undefined}>
                  <td className="px-4 py-3 align-top">
                    <Skeleton className="h-4 w-4" />
                  </td>
                  <td className="px-4 py-3 align-top">
                    <Skeleton className="h-4 w-40" />
                  </td>
                  <td className="px-4 py-3 align-top">
                    <Skeleton className="h-4 w-10" />
                  </td>
                  <td className="px-4 py-3 text-right align-top">
                    <Skeleton className="ml-auto h-4 w-10" />
                  </td>
                  <td className="px-4 py-3 align-top">
                    <Skeleton className="h-5 w-20 rounded-full" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex items-center justify-center border-t border-border/70 px-4 py-3">
            <Skeleton className="h-7 w-24 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
