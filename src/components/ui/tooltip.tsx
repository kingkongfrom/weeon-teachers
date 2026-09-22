"use client";

import { cn } from "@/lib/utils";
import type { ReactElement, ReactNode } from "react";

type TooltipProps = {
  content: ReactNode;
  children: ReactElement;
  className?: string;
};

/** Hover/focus tooltip — styled popup with rounded corners (replaces native `title`). */
export function Tooltip({ content, children, className }: TooltipProps) {
  return (
    <span className={cn("group/tooltip relative inline-flex", className)}>
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1.5 w-max max-w-52 -translate-x-1/2 rounded-xl bg-black/65 px-[12px] py-[8px] text-center text-[13px] font-medium leading-snug text-white opacity-0 shadow-md transition-opacity duration-150 group-hover/tooltip:opacity-100 group-focus-within/tooltip:opacity-100"
      >
        {content}
        <span
          aria-hidden="true"
          className="absolute left-1/2 top-full -translate-x-1/2 border-[5px] border-transparent border-t-black/65"
        />
      </span>
    </span>
  );
}
