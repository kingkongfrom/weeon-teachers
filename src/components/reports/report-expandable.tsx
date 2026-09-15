"use client";

import { useId, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/utils";

type ReportExpandableProps = {
  title: string;
  subtitle?: string;
  badge?: string;
  defaultOpen?: boolean;
  children: ReactNode;
};

/** Collapsible detail block — keeps summary tables clean while exposing fine-grained data. */
export function ReportExpandable({
  title,
  subtitle,
  badge,
  defaultOpen = false,
  children,
}: ReportExpandableProps) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();

  return (
    <div className="border-t border-border/80">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-3 px-5 py-3.5 text-left transition-colors hover:bg-surface-muted/50"
      >
        <span
          className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700 transition-transform dark:bg-brand-950/50 dark:text-brand-300",
            open && "rotate-180",
          )}
        >
          <ChevronDown className="h-4 w-4" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-foreground">{title}</span>
          {subtitle ? (
            <span className="mt-0.5 block text-xs font-medium text-foreground/45">{subtitle}</span>
          ) : null}
        </span>
        {badge ? (
          <span className="shrink-0 rounded-full bg-surface-muted px-2.5 py-0.5 text-[11px] font-semibold tabular-nums text-foreground/55">
            {badge}
          </span>
        ) : null}
      </button>

      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            id={panelId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="border-t border-border/60 bg-surface-muted/20 px-5 py-4">{children}</div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
