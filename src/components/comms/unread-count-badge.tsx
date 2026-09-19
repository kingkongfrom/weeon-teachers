import { cn } from "@/lib/utils";

export function UnreadCountBadge({
  count,
  className,
  absolute,
}: {
  count: number;
  className?: string;
  /** Pin to top-right of a relative parent (hub icon, nav icon). */
  absolute?: boolean;
}) {
  if (count <= 0) return null;

  return (
    <span
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-error px-1.5 text-[10px] font-bold leading-none text-white shadow-sm",
        absolute && "absolute -right-1.5 -top-1.5",
        className,
      )}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
