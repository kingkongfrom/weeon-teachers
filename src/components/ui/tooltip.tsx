"use client";

import { cn } from "@/lib/utils";
import type { ReactElement, ReactNode } from "react";

export type TooltipPlacement = "top" | "bottom" | "left" | "right";

type TooltipProps = {
  content: ReactNode;
  children: ReactElement;
  className?: string;
  /** Prefer `bottom` under sticky top toolbars; `right` for collapsed sidebar icons. */
  placement?: TooltipPlacement;
};

const bubbleBase =
  "pointer-events-none absolute z-[60] w-max max-w-[16rem] rounded-xl border border-border/80 bg-surface px-4 py-2.5 text-sm font-semibold leading-snug text-foreground shadow-[0_8px_24px_-4px_rgba(15,23,42,0.18)] opacity-0 transition-opacity duration-150 group-hover/tooltip:opacity-100 group-focus-within/tooltip:opacity-100 dark:shadow-[0_8px_28px_-4px_rgba(0,0,0,0.45)]";

const placementBubble: Record<TooltipPlacement, string> = {
  top: "bottom-full left-1/2 mb-2 -translate-x-1/2",
  bottom: "top-full left-1/2 mt-2 -translate-x-1/2",
  left: "right-full top-1/2 mr-2 -translate-y-1/2",
  right: "left-full top-1/2 ml-2 -translate-y-1/2",
};

function TooltipCaret({ placement }: { placement: TooltipPlacement }) {
  if (placement === "bottom") {
    return (
      <>
        <span
          aria-hidden="true"
          className="absolute bottom-full left-1/2 -translate-x-1/2 border-[6px] border-transparent border-b-border/80"
        />
        <span
          aria-hidden="true"
          className="absolute bottom-[calc(100%-1px)] left-1/2 -translate-x-1/2 border-[5px] border-transparent border-b-surface"
        />
      </>
    );
  }
  if (placement === "top") {
    return (
      <>
        <span
          aria-hidden="true"
          className="absolute left-1/2 top-full -translate-x-1/2 border-[6px] border-transparent border-t-border/80"
        />
        <span
          aria-hidden="true"
          className="absolute left-1/2 top-[calc(100%-1px)] -translate-x-1/2 border-[5px] border-transparent border-t-surface"
        />
      </>
    );
  }
  if (placement === "right") {
    return (
      <>
        <span
          aria-hidden="true"
          className="absolute right-full top-1/2 -translate-y-1/2 border-[6px] border-transparent border-r-border/80"
        />
        <span
          aria-hidden="true"
          className="absolute right-[calc(100%-1px)] top-1/2 -translate-y-1/2 border-[5px] border-transparent border-r-surface"
        />
      </>
    );
  }
  return (
    <>
      <span
        aria-hidden="true"
        className="absolute left-full top-1/2 -translate-y-1/2 border-[6px] border-transparent border-l-border/80"
      />
      <span
        aria-hidden="true"
        className="absolute left-[calc(100%-1px)] top-1/2 -translate-y-1/2 border-[5px] border-transparent border-l-surface"
      />
    </>
  );
}

/** Hover/focus tooltip — use instead of native `title` on icon controls. */
export function Tooltip({
  content,
  children,
  className,
  placement = "top",
}: TooltipProps) {
  return (
    <span className={cn("group/tooltip relative inline-flex", className)}>
      {children}
      <span role="tooltip" className={cn(bubbleBase, placementBubble[placement])}>
        <span className="relative z-[1] block whitespace-nowrap">{content}</span>
        <TooltipCaret placement={placement} />
      </span>
    </span>
  );
}
