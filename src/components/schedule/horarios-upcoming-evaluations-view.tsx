"use client";

import type { TeacherUpcomingEvaluation } from "@/lib/dashboard/calendar-types";
import { hubToneSurface } from "@/lib/dashboard/tones";
import { useLiveLocale, useLiveT } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";



/** Upcoming exams/activities — client-rendered so labels follow the locale. */
export function HorariosUpcomingEvaluationsView({ items }: { items: TeacherUpcomingEvaluation[] }) {
  const t = useLiveT();
  const locale = useLiveLocale();
  const copy = t.horarios.upcomingEvaluations;
  const a = t.agenda.events;
  const intlLocale = locale === "en" ? "en-US" : "es-CR";

  return (
    <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-5">
      <div className="mb-3 flex flex-col gap-1.5">
        <h2 className="text-base font-bold text-foreground sm:text-lg">{copy.title}</h2>
        <span className="brand-gradient h-0.5 w-10 rounded-full opacity-80" aria-hidden />
      </div>

      {items.length === 0 ? (
        <p className="text-sm font-medium text-foreground/55">{copy.empty}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <li
              key={item.key}
              className="flex items-start gap-3 rounded-xl border border-border/80 bg-background/60 px-3 py-2.5 sm:gap-4 sm:px-4 sm:py-3"
            >
              <EvalDateChip date={item.date} locale={intlLocale} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-foreground">{item.title}</p>
                <p className="mt-0.5 text-xs font-medium text-foreground/55">
                  {[whenLabel(item, a.form.allDay), item.groupName, sourceLabel(item.source, copy)]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              <span
                className={cn(
                  "hidden shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide sm:inline",
                  hubToneSurface(item.kind === "activity" ? "green" : "rose"),
                )}
              >
                {a.types[item.kind]}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function EvalDateChip({ date, locale }: { date: string; locale: string }) {
  const [year, month, day] = date.split("-").map(Number);
  const value = new Date(year, (month ?? 1) - 1, day ?? 1);
  return (
    <div className="flex w-12 shrink-0 flex-col items-center rounded-lg bg-brand-50/90 py-1 text-brand-800 dark:bg-brand-950/35 dark:text-brand-200 sm:w-14 sm:rounded-xl sm:py-1.5">
      <span className="text-[9px] font-bold uppercase tracking-wide sm:text-[10px]">
        {value.toLocaleDateString(locale, { month: "short" })}
      </span>
      <span className="text-base font-bold leading-none tabular-nums sm:text-lg">{value.getDate()}</span>
    </div>
  );
}

function whenLabel(item: { allDay: boolean; time: string | null }, allDayLabel: string): string {
  if (item.allDay || !item.time) return allDayLabel;
  return item.time;
}

function sourceLabel(
  source: "calendar" | "aula",
  copy: { sourceCalendar: string; sourceAula: string },
): string {
  return source === "aula" ? copy.sourceAula : copy.sourceCalendar;
}
