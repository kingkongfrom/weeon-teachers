"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  "pointer-events-none absolute z-[60] w-max max-w-[14rem] rounded-md bg-foreground/85 px-2 py-1 text-[11px] font-medium leading-tight text-background opacity-0 transition-opacity duration-150 group-hover/tooltip:opacity-100 group-focus-within/tooltip:opacity-100 [.tooltip-touch-open_&]:opacity-100 dark:bg-foreground/90";

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

/**
 * Hover / focus / LONG-PRESS tooltip — use instead of native `title` on icon
 * controls.
 *
 * TOUCH IS A FIRST-CLASS CASE, NOT AN AFTERTHOUGHT.
 *
 * This was hover and focus only, so on a phone NOTHING happened: there is no
 * pointer to hover with, and the icon buttons are not focusable-by-default in a
 * way a finger can reach. Every tooltip in Comunicación was invisible on the
 * device where the labels matter most.
 *
 * A long press (450ms, no movement) now shows it, which is the platform
 * convention users already expect. `onContextMenu` is prevented while pressed so
 * iOS' text-selection callout and Android's context menu do not fight it.
 */
export function Tooltip({ content, children, className, placement = "top" }: TooltipProps) {
  const [touchedOpen, setTouchedOpen] = useState(false);
  const holdRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearHold = useCallback(() => {
    if (holdRef.current) {
      clearTimeout(holdRef.current);
      holdRef.current = null;
    }
  }, []);

  useEffect(() => clearHold, [clearHold]);

  return (
    <span
      className={cn(
        "group/tooltip relative inline-flex",
        touchedOpen && "tooltip-touch-open",
        className,
      )}
      onPointerDown={(event) => {
        if (event.pointerType === "mouse") return;
        clearHold();
        holdRef.current = setTimeout(() => setTouchedOpen(true), 450);
      }}
      onPointerUp={clearHold}
      onPointerCancel={clearHold}
      onPointerLeave={clearHold}
      /* Swallow the platform callout while a long press is in progress; the
       * bubble itself is informational, so the native menu adds nothing. */
      onContextMenu={(event) => {
        if (touchedOpen) event.preventDefault();
      }}
      onBlur={() => setTouchedOpen(false)}
    >
      {children}
      <span role="tooltip" className={cn(bubbleBase, placementBubble[placement])}>
        <span className="relative z-[1] block whitespace-normal">{content}</span>
        <TooltipCaret placement={placement} />
      </span>
    </span>
  );
}

