import { cn } from "@/lib/utils";

/** Neutral loading placeholder. Pairs with the page skeletons in `loading.tsx`. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("animate-pulse rounded-md bg-surface-muted/80", className)}
    />
  );
}
