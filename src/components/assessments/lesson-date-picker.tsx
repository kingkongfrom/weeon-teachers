"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLiveLocale, useLiveT } from "@/lib/i18n/client";
import { capitalize, monthCells, weekdayIndex } from "@/lib/dashboard/month";
import { isoDate } from "@/lib/dashboard/week";
import type { ClassLessonDay } from "@/lib/dashboard/exam-dates";
import type { Weekday } from "@/lib/dashboard/schedule";

const WEEKDAY_BY_INDEX: Weekday[] = ["mon", "tue", "wed", "thu", "fri"];

/**
 * Exam-date calendar, shown in the dialog. Only weekdays the class meets for
 * this subject can be chosen. Other days stay in the grid, quietly gray.
 */
export function LessonDatePicker({
  value,
  lessons,
  onChange,
  onPickLesson,
  selectedLessonId,
  clearLabel,
}: {
  value: string | null;
  /** Subject-filtered periods of the class. */
  lessons: ClassLessonDay[];
  onChange: (value: string | null) => void;
  onPickLesson?: (lessonId: string) => void;
  selectedLessonId?: string | null;
  clearLabel?: string;
}) {
  const locale = useLiveLocale();
  const t = useLiveT();
  const tag = locale === "en" ? "en-US" : "es-CR";
  const selected = value ? parseDay(value) : null;
  const [view, setView] = useState(() => monthStart(selected ?? new Date()));

  const lessonsOnDay = (date: Date): ClassLessonDay[] => {
    const weekday = WEEKDAY_BY_INDEX[weekdayIndex(date)];
    if (!weekday) return [];
    return lessons.filter((lesson) => lesson.weekday === weekday);
  };

  const todayKey = isoDate(new Date());
  const cells = monthCells(view);
  const monthLabel = capitalize(view.toLocaleDateString(tag, { month: "long", year: "numeric" }));
  const weekdayLabels = Array.from({ length: 5 }, (_, index) => {
    const sample = new Date(2026, 0, 5 + index);
    return capitalize(sample.toLocaleDateString(tag, { weekday: "short" }).replace(".", ""));
  });

  function pick(date: Date) {
    const slots = lessonsOnDay(date);
    if (slots.length === 0 || date.getMonth() !== view.getMonth()) return;
    onChange(isoDate(date));
    if (onPickLesson) {
      const current = slots.find((slot) => slot.lessonId === selectedLessonId) ?? slots[0];
      onPickLesson(current.lessonId);
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface">
      <div className="flex items-center justify-between gap-2 border-b border-border px-2 py-2">
        <button
          type="button"
          onClick={() => setView(addMonths(view, -1))}
          aria-label={t.datePicker.prevMonth}
          className="flex h-8 w-8 items-center justify-center rounded-full text-foreground/55 transition-colors hover:bg-surface-muted hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-bold text-foreground">{monthLabel}</span>
        <button
          type="button"
          onClick={() => setView(addMonths(view, 1))}
          aria-label={t.datePicker.nextMonth}
          className="flex h-8 w-8 items-center justify-center rounded-full text-foreground/55 transition-colors hover:bg-surface-muted hover:text-foreground"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-5 bg-brand-50/70 dark:bg-brand-950/30">
        {weekdayLabels.map((label) => (
          <div
            key={label}
            className="py-1.5 text-center text-[10px] font-bold uppercase tracking-wider text-brand-700/75 dark:text-brand-300/85"
          >
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-5">
        {cells.map((day) => {
          const key = isoDate(day);
          const inMonth = day.getMonth() === view.getMonth();
          const slots = lessonsOnDay(day);
          const available = inMonth && slots.length > 0;
          const isSelected = value === key;
          const isToday = key === todayKey;
          return (
            <button
              key={key}
              type="button"
              disabled={!available}
              onClick={() => pick(day)}
              title={available ? slots.map(formatSlot).join(" · ") : undefined}
              className={cn(
                "relative flex h-11 flex-col items-center justify-center border-b border-r border-border text-sm transition-colors [&:nth-child(5n)]:border-r-0",
                available
                  ? "bg-surface font-bold text-foreground hover:bg-[#fff5f7] disabled:opacity-100 dark:hover:bg-[#3a1622]/30"
                  : cn(
                      "cursor-default bg-surface font-medium disabled:opacity-100",
                      inMonth ? "text-foreground/30" : "text-foreground/20",
                    ),
                isSelected && "bg-[#fff5f7] text-[#9f1239] ring-2 ring-inset ring-[#e11d48]/40 dark:bg-[#3a1622]/50 dark:text-[#fecdd3]",
              )}
            >
              <span
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full",
                  isToday && available && !isSelected && "brand-gradient text-white",
                  isToday && !available && "ring-1 ring-inset ring-foreground/20",
                )}
              >
                {day.getDate()}
              </span>
              {available ? (
                <span
                  className={cn("absolute bottom-1 h-1 w-1 rounded-full bg-[#e11d48]", isSelected && "bg-[#9f1239]")}
                  aria-hidden
                />
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-border px-3 py-2">
        <span className="text-[11px] font-medium text-foreground/45">{t.examDates.onlyClassDays}</span>
        {value ? (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="rounded-lg px-2 py-1 text-xs font-semibold text-foreground/50 transition-colors hover:bg-error/10 hover:text-error"
          >
            {clearLabel ?? t.datePicker.clear}
          </button>
        ) : null}
      </div>
    </div>
  );
}

function formatSlot(lesson: ClassLessonDay): string {
  return `${lesson.startTime.slice(0, 5)}–${lesson.endTime.slice(0, 5)}${lesson.room ? ` · ${lesson.room}` : ""}`;
}

function monthStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, delta: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}

function parseDay(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
}
