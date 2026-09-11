"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocale, useT } from "@/lib/i18n/client";

/**
 * App-styled date picker (replaces `<input type="date">`, whose native calendar
 * can't be themed). Value is a date-only `YYYY-MM-DD` string or null.
 */
export function DatePicker({
  value,
  onChange,
  placeholder,
  clearLabel,
  className,
}: {
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
  clearLabel?: string;
  className?: string;
}) {
  const locale = useLocale();
  const t = useT();
  const d = t.datePicker;
  const tag = locale === "en" ? "en-US" : "es-CR";

  const [open, setOpen] = useState(false);
  const selected = value ? parseDateOnly(value) : null;
  // The month being viewed: an explicit override while the user pages, else
  // derived from the selection (or today). No effect/sync needed.
  const [viewOverride, setViewOverride] = useState<Date | null>(null);
  const view = viewOverride ?? monthStart(selected ?? new Date());
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function toggleOpen() {
    if (!open) setViewOverride(null);
    setOpen(!open);
  }

  const weekdayFormatter = new Intl.DateTimeFormat(tag, { weekday: "short" });
  // 2024-01-01 is a Monday — Monday-first grid.
  const weekdays = Array.from({ length: 7 }, (_, index) =>
    weekdayFormatter.format(new Date(2024, 0, 1 + index)),
  );

  const monthLabel = new Intl.DateTimeFormat(tag, {
    month: "long",
    year: "numeric",
  }).format(view);

  const triggerLabel = selected
    ? new Intl.DateTimeFormat(tag, {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(selected)
    : null;

  const today = new Date();
  const days = buildGrid(view);

  function pick(date: Date) {
    onChange(formatDateOnly(date));
    setOpen(false);
  }

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={toggleOpen}
        className={cn(
          "inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-background px-3 text-sm font-medium transition-colors hover:border-brand-300 focus-visible:border-brand-400 focus-visible:outline-none",
          triggerLabel ? "text-foreground" : "text-foreground/45",
        )}
      >
        <CalendarIcon className="h-4 w-4 text-foreground/50" />
        {triggerLabel ?? placeholder ?? d.placeholder}
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 top-11 z-40 w-[19rem] rounded-2xl border border-border bg-surface p-3 shadow-2xl"
            role="dialog"
            aria-label={d.placeholder}
          >
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setViewOverride(addMonths(view, -1))}
                aria-label={d.prevMonth}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-foreground/60 transition-colors hover:bg-surface-muted hover:text-foreground"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm font-bold capitalize text-foreground">
                {monthLabel}
              </span>
              <button
                type="button"
                onClick={() => setViewOverride(addMonths(view, 1))}
                aria-label={d.nextMonth}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-foreground/60 transition-colors hover:bg-surface-muted hover:text-foreground"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-2 grid grid-cols-7 gap-0.5">
              {weekdays.map((weekday) => (
                <span
                  key={weekday}
                  className="py-1 text-center text-[10px] font-bold uppercase tracking-wide text-foreground/40"
                >
                  {weekday.slice(0, 2)}
                </span>
              ))}
              {days.map((day) => {
                const isSelected =
                  selected !== null && sameDay(day.date, selected);
                const isToday = sameDay(day.date, today);
                return (
                  <button
                    key={day.iso}
                    type="button"
                    onClick={() => pick(day.date)}
                    className={cn(
                      "flex h-9 items-center justify-center rounded-lg text-sm font-medium transition-colors",
                      isSelected
                        ? "brand-gradient text-white"
                        : isToday
                          ? "bg-brand-50 text-brand-700 dark:bg-brand-950/50 dark:text-brand-300"
                          : day.inMonth
                            ? "text-foreground/80 hover:bg-surface-muted"
                            : "text-foreground/30 hover:bg-surface-muted/60",
                    )}
                  >
                    {day.date.getDate()}
                  </button>
                );
              })}
            </div>

            <div className="mt-3 flex items-center justify-between border-t border-border pt-2">
              <button
                type="button"
                onClick={() => {
                  onChange(formatDateOnly(new Date()));
                  setOpen(false);
                }}
                className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-brand-700 transition-colors hover:bg-brand-50 dark:text-brand-300 dark:hover:bg-brand-950/40"
              >
                {d.today}
              </button>
              {value ? (
                <button
                  type="button"
                  onClick={() => {
                    onChange(null);
                    setOpen(false);
                  }}
                  className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-foreground/50 transition-colors hover:bg-error/10 hover:text-error"
                >
                  {clearLabel ?? d.clear}
                </button>
              ) : null}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function monthStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, delta: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function parseDateOnly(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
}

function formatDateOnly(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** 6-week grid, Monday-first, including leading/trailing days from adjacent months. */
function buildGrid(view: Date): { date: Date; iso: string; inMonth: boolean }[] {
  const first = monthStart(view);
  const offset = (first.getDay() + 6) % 7; // Monday = 0
  const start = new Date(first.getFullYear(), first.getMonth(), 1 - offset);
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(
      start.getFullYear(),
      start.getMonth(),
      start.getDate() + index,
    );
    return {
      date,
      iso: formatDateOnly(date),
      inMonth: date.getMonth() === first.getMonth(),
    };
  });
}
