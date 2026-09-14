"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import {
  AGENDA_DAYS,
  capitalize,
  type CalendarView as CalendarViewMode,
  isSameDay,
  layoutTimedRanges,
  monthCells,
  shiftAnchor,
  timeBlockOffset,
  WEEK_END_HOUR,
  WEEK_START_HOUR,
  weekdayIndex,
} from "@/lib/dashboard/month";
import { addDays, isoDate, mondayOf } from "@/lib/dashboard/week";
import { useLocale, useT } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";
import type { CalendarEventType, TeacherCalendarEvent, TeacherExamDue } from "@/lib/dashboard/calendar";

type StyleKey = CalendarEventType | "exam";

const STYLES: Record<StyleKey, { chip: string; dot: string }> = {
  institutional: {
    chip: "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700/60 dark:bg-slate-800/50 dark:text-slate-200",
    dot: "bg-slate-500",
  },
  academic: {
    chip: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-300",
    dot: "bg-sky-500",
  },
  meeting: {
    chip: "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900/60 dark:bg-violet-950/40 dark:text-violet-300",
    dot: "bg-violet-500",
  },
  holiday: {
    chip: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200",
    dot: "bg-amber-500",
  },
  activity: {
    chip: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300",
    dot: "bg-emerald-500",
  },
  exam: {
    chip: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300",
    dot: "bg-rose-500",
  },
};

const EVENT_TYPES: CalendarEventType[] = [
  "institutional",
  "academic",
  "meeting",
  "holiday",
  "activity",
];

type CalItem = {
  id: string;
  title: string;
  date: string;
  endDate: string | null;
  allDay: boolean;
  startTime: string | null;
  endTime: string | null;
  type: StyleKey;
  location: string | null;
  group: string | null;
};

const WEEK_HOURS = Array.from(
  { length: WEEK_END_HOUR - WEEK_START_HOUR },
  (_, index) => WEEK_START_HOUR + index,
);

/** Teacher calendar matching the school ERP: month / week / day / agenda views,
 * a time-grid week, a legend + selected-day + upcoming sidebar, type filter and
 * search. Read-only: institution events + the teacher's aula virtual exams. */
export function CalendarView({
  view,
  anchorISO,
  todayISO,
  events,
  exams,
}: {
  view: CalendarViewMode;
  anchorISO: string;
  todayISO: string;
  events: TeacherCalendarEvent[];
  exams: TeacherExamDue[];
}) {
  const t = useT();
  const locale = useLocale();
  const cal = t.agenda.calendario;
  const intlLocale = locale === "en" ? "en-US" : "es-CR";
  const router = useRouter();

  const [selectedKey, setSelectedKey] = useState(anchorISO);
  const [query, setQuery] = useState("");
  const [hidden, setHidden] = useState<Set<StyleKey>>(new Set());

  const anchor = useMemo(() => parseISO(anchorISO), [anchorISO]);
  const today = useMemo(() => parseISO(todayISO), [todayISO]);

  const items = useMemo<CalItem[]>(
    () => [
      ...events.map((event) => ({
        id: event.id,
        title: event.title,
        date: event.date,
        endDate: event.endDate,
        allDay: event.allDay,
        startTime: event.startTime,
        endTime: event.endTime,
        type: event.eventType,
        location: event.location,
        group: event.groupName,
      })),
      ...exams.map((exam) => ({
        id: exam.id,
        title: exam.title,
        date: exam.date,
        endDate: null,
        allDay: !exam.time,
        startTime: exam.time,
        endTime: null,
        type: "exam" as const,
        location: null,
        group: exam.className,
      })),
    ],
    [events, exams],
  );

  const itemsOn = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const visible = items.filter((item) => {
      if (hidden.has(item.type)) return false;
      if (!needle) return true;
      return [item.title, item.location, item.group]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(needle));
    });
    return (key: string) =>
      visible
        .filter((item) => key >= item.date && key <= (item.endDate ?? item.date))
        .sort((a, b) => {
          if (a.allDay !== b.allDay) return a.allDay ? -1 : 1;
          return (a.startTime ?? "").localeCompare(b.startTime ?? "");
        });
  }, [hidden, items, query]);

  function go(nextView: CalendarViewMode, dateISO: string) {
    router.push(`/agenda/calendario?view=${nextView}&date=${dateISO}`);
  }
  function openDay(dateISO: string) {
    setSelectedKey(dateISO);
    go("day", dateISO);
  }
  function selectDay(dateISO: string) {
    setSelectedKey(dateISO);
  }
  function toggleType(type: StyleKey) {
    setHidden((current) => {
      const next = new Set(current);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }

  const views: CalendarViewMode[] = ["month", "week", "day", "agenda"];
  const viewLabel: Record<CalendarViewMode, string> = {
    month: cal.month,
    week: cal.week,
    day: cal.day,
    agenda: cal.agenda,
  };
  const title =
    view === "day"
      ? dayTitle(anchor, intlLocale)
      : view === "week"
        ? weekTitle(anchor, intlLocale)
        : capitalize(anchor.toLocaleDateString(intlLocale, { month: "long", year: "numeric" }));

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:px-4">
        <div className="flex items-center gap-2">
          <IconButton label={cal.prev} onClick={() => go(view, isoDate(shiftAnchor(view, anchor, -1)))}>
            <Chevron direction="left" />
          </IconButton>
          <button
            type="button"
            onClick={() => go(view, todayISO)}
            className="h-9 rounded-lg border border-border bg-surface px-3 text-xs font-semibold text-foreground transition-colors hover:bg-surface-muted"
          >
            {cal.today}
          </button>
          <IconButton label={cal.next} onClick={() => go(view, isoDate(shiftAnchor(view, anchor, 1)))}>
            <Chevron direction="right" />
          </IconButton>
          <h2 className="ml-1 text-base font-bold capitalize text-brand-700 sm:text-lg dark:text-brand-300">
            {title}
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex overflow-hidden rounded-lg border border-border bg-surface p-1">
            {views.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => go(option, selectedKey)}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-semibold transition-colors",
                  view === option
                    ? "bg-brand-50 text-brand-700 dark:bg-brand-950/50 dark:text-brand-300"
                    : "text-foreground/60 hover:text-foreground",
                )}
              >
                {viewLabel[option]}
              </button>
            ))}
          </div>

          <details className="relative">
            <summary className="flex h-8 cursor-pointer list-none items-center rounded-lg border border-border bg-surface px-3 text-xs font-semibold text-foreground/70 hover:bg-surface-muted [&::-webkit-details-marker]:hidden">
              {cal.types}
            </summary>
            <div className="absolute right-0 z-30 mt-2 flex w-52 flex-col gap-1 rounded-xl border border-border bg-surface p-2 shadow-lg">
              {(["exam", ...EVENT_TYPES] as StyleKey[]).map((type) => {
                const active = !hidden.has(type);
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => toggleType(type)}
                    className={cn(
                      "rounded-lg border px-2.5 py-1.5 text-left text-[11px] font-bold",
                      active ? STYLES[type].chip : "border-border bg-surface text-foreground/35",
                    )}
                  >
                    {typeLabel(t, type)}
                  </button>
                );
              })}
            </div>
          </details>

          <label className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-foreground/40" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={cal.search}
              className="h-8 w-40 rounded-lg border border-border bg-surface pl-8 pr-2.5 text-sm text-foreground outline-none transition-all placeholder:text-foreground/40 focus:border-brand-400 sm:w-48"
            />
          </label>
        </div>
      </div>

      <section className="overflow-hidden rounded-2xl border border-border bg-surface">
          {view === "month" ? (
            <MonthView
              anchor={anchor}
              todayISO={todayISO}
              selectedKey={selectedKey}
              itemsOn={itemsOn}
              onSelect={selectDay}
              onOpenDay={openDay}
            />
          ) : view === "week" ? (
            <WeekView
              anchor={anchor}
              today={today}
              itemsOn={itemsOn}
              onSelect={selectDay}
              onOpenDay={openDay}
            />
          ) : view === "day" ? (
            <DayView anchor={anchor} today={today} itemsOn={itemsOn} onSelect={selectDay} />
          ) : (
            <AgendaView anchor={anchor} itemsOn={itemsOn} onOpenDay={openDay} />
          )}
      </section>
    </div>
  );
}

/* ---------- views ---------- */

function MonthView({
  anchor,
  todayISO,
  selectedKey,
  itemsOn,
  onSelect,
  onOpenDay,
}: {
  anchor: Date;
  todayISO: string;
  selectedKey: string;
  itemsOn: (key: string) => CalItem[];
  onSelect: (key: string) => void;
  onOpenDay: (key: string) => void;
}) {
  const t = useT();
  const locale = useLocale();
  const month = anchor.getMonth();
  const cells = monthCells(anchor);

  return (
    <div>
      <div className="grid grid-cols-5 border-b border-border bg-brand-50/70 dark:bg-brand-950/30">
        {weekdayLabels(locale).slice(0, 5).map((label) => (
          <div
            key={label}
            className="px-2 py-2.5 text-center text-[11px] font-bold uppercase tracking-wider text-brand-700/75 dark:text-brand-300/85"
          >
            {label}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-5">
        {cells.map((day) => {
          const key = isoDate(day);
          const inMonth = day.getMonth() === month;
          const isToday = key === todayISO;
          const isSelected = key === selectedKey;
          const dayItems = itemsOn(key);
          const shown = dayItems.slice(0, 3);
          const overflow = dayItems.length - shown.length;

          return (
            <div
              key={key}
              role="button"
              tabIndex={0}
              onClick={() => onSelect(key)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelect(key);
                }
              }}
              className={cn(
                "flex min-h-[7.25rem] cursor-pointer flex-col gap-1 border-b border-r border-border p-1.5 text-left transition-colors [&:nth-child(5n)]:border-r-0",
                inMonth ? "bg-surface" : "bg-surface-muted/20",
                isSelected && "ring-2 ring-inset ring-brand-500/40",
              )}
            >
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onOpenDay(key);
                }}
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold",
                  isToday
                    ? "brand-gradient text-white"
                    : inMonth
                      ? "text-foreground hover:bg-surface-muted"
                      : "text-foreground/35",
                )}
              >
                {day.getDate()}
              </button>
              <div className="flex min-h-0 flex-1 flex-col gap-0.5">
                {shown.map((item) => (
                  <span
                    key={item.id}
                    title={item.title}
                    className={cn(
                      "truncate rounded-md border px-1.5 py-0.5 text-[10px] font-bold leading-4",
                      STYLES[item.type].chip,
                    )}
                  >
                    {item.allDay || !item.startTime
                      ? item.title
                      : `${item.startTime} ${item.title}`}
                  </span>
                ))}
                {overflow > 0 ? (
                  <span className="px-1 text-[10px] font-semibold text-foreground/45">
                    {t.agenda.calendario.more(overflow)}
                  </span>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WeekView({
  anchor,
  today,
  itemsOn,
  onSelect,
  onOpenDay,
}: {
  anchor: Date;
  today: Date;
  itemsOn: (key: string) => CalItem[];
  onSelect: (key: string) => void;
  onOpenDay: (key: string) => void;
}) {
  const locale = useLocale();
  const monday = mondayOf(anchor);
  const days = Array.from({ length: 5 }, (_, index) => addDays(monday, index));
  const now = useNow();

  return (
    <div className="overflow-x-auto">
      <div className="grid min-w-[40rem] grid-cols-[3.5rem_repeat(5,minmax(0,1fr))]">
        <div className="border-b border-border" />
        {days.map((day) => {
          const key = isoDate(day);
          const isToday = isSameDay(day, today);
          return (
            <button
              key={key}
              type="button"
              onClick={() => onOpenDay(key)}
              className={cn(
                "border-b border-l border-border bg-brand-50/40 px-2 py-3 text-center transition-colors hover:bg-brand-50 dark:bg-brand-950/20 dark:hover:bg-brand-950/30",
                key === isoDate(anchor) && "bg-brand-100 dark:bg-brand-950/40",
              )}
            >
              <p className="text-[10px] font-bold uppercase tracking-wider text-brand-700/75 dark:text-brand-300/85">
                {weekdayLabels(locale)[weekdayIndex(day)]}
              </p>
              <p
                className={cn(
                  "mx-auto mt-1 flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold",
                  isToday ? "brand-gradient text-white" : "text-foreground",
                )}
              >
                {day.getDate()}
              </p>
            </button>
          );
        })}

        <div className="border-b border-border py-2" />
        {days.map((day) => {
          const key = isoDate(day);
          const allDay = itemsOn(key).filter((item) => item.allDay || !item.startTime);
          return (
            <div
              key={`all-${key}`}
              onClick={() => onSelect(key)}
              onDoubleClick={() => onOpenDay(key)}
              className="min-h-14 cursor-pointer space-y-1 border-b border-l border-border p-1.5"
            >
              {allDay.map((item) => (
                <span
                  key={item.id}
                  title={item.title}
                  className={cn(
                    "block w-full truncate rounded-md border px-1.5 py-1 text-left text-[10px] font-bold",
                    STYLES[item.type].chip,
                  )}
                >
                  {item.title}
                </span>
              ))}
            </div>
          );
        })}

        <HourLabels hourHeight={HOUR_HEIGHT} />

        {days.map((day) => {
          const key = isoDate(day);
          return (
            <TimeColumn
              key={`grid-${key}`}
              items={itemsOn(key)}
              now={now && isSameDay(day, today) ? now : null}
              onSelect={() => onSelect(key)}
            />
          );
        })}
      </div>
    </div>
  );
}

function DayView({
  anchor,
  today,
  itemsOn,
  onSelect,
}: {
  anchor: Date;
  today: Date;
  itemsOn: (key: string) => CalItem[];
  onSelect: (key: string) => void;
}) {
  const t = useT();
  const locale = useLocale();
  const key = isoDate(anchor);
  const allDay = itemsOn(key).filter((item) => item.allDay || !item.startTime);
  const now = useNow();

  return (
    <div className="overflow-x-auto">
      <div className="grid min-w-[28rem] grid-cols-[3.5rem_minmax(0,1fr)]">
        <div className="border-b border-border" />
        <div className="border-b border-l border-border bg-brand-50/40 px-4 py-3 dark:bg-brand-950/20">
          <p className="text-[10px] font-bold uppercase tracking-wider text-brand-700/75 dark:text-brand-300/85">
            {weekdayLabels(locale)[weekdayIndex(anchor)]}
          </p>
          <p
            className={cn(
              "mt-1 flex h-10 w-10 items-center justify-center rounded-full text-lg font-bold",
              isSameDay(anchor, today) ? "brand-gradient text-white" : "text-foreground",
            )}
          >
            {anchor.getDate()}
          </p>
        </div>

        <div className="border-b border-border py-2" />
        <div
          className="min-h-14 cursor-pointer space-y-1 border-b border-l border-border p-2"
          onClick={() => onSelect(key)}
        >
          {allDay.length > 0 ? (
            allDay.map((item) => (
              <span
                key={item.id}
                className={cn(
                  "block w-full truncate rounded-md border px-2 py-1.5 text-left text-xs font-bold",
                  STYLES[item.type].chip,
                )}
              >
                {item.title}
              </span>
            ))
          ) : (
            <p className="px-1 py-2 text-xs font-medium text-foreground/35">
              {t.agenda.events.form.allDay}
            </p>
          )}
        </div>

        <HourLabels hourHeight={DAY_HOUR_HEIGHT} />
        <TimeColumn
          items={itemsOn(key)}
          hourHeight={DAY_HOUR_HEIGHT}
          now={isSameDay(anchor, today) ? now : null}
          onSelect={() => onSelect(key)}
          spacious
        />
      </div>
    </div>
  );
}

function AgendaView({
  anchor,
  itemsOn,
  onOpenDay,
}: {
  anchor: Date;
  itemsOn: (key: string) => CalItem[];
  onOpenDay: (key: string) => void;
}) {
  const t = useT();
  const locale = useLocale();
  const intlLocale = locale === "en" ? "en-US" : "es-CR";
  const days = Array.from({ length: AGENDA_DAYS }, (_, index) => addDays(anchor, index)).filter(
    (day) => weekdayIndex(day) < 5 && itemsOn(isoDate(day)).length > 0,
  );

  if (days.length === 0) {
    return (
      <p className="px-6 py-16 text-center text-sm font-medium text-foreground/50">
        {t.agenda.calendario.empty}
      </p>
    );
  }

  return (
    <div className="divide-y divide-border">
      {days.map((day) => {
        const key = isoDate(day);
        return (
          <section key={key} className="grid gap-3 px-5 py-4 sm:grid-cols-[11rem_minmax(0,1fr)]">
            <button
              type="button"
              onClick={() => onOpenDay(key)}
              className="text-left text-sm font-bold capitalize text-foreground hover:text-brand-700 dark:hover:text-brand-300"
            >
              {dayTitle(day, intlLocale)}
            </button>
            <ul className="flex flex-col gap-2">
              {itemsOn(key).map((item) => (
                <li key={item.id}>
                  <ItemRow item={item} t={t} />
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

/* ---------- pieces ---------- */

const WEEK_HOUR_HEIGHT = 52;
const HOUR_HEIGHT = WEEK_HOUR_HEIGHT;
const DAY_HOUR_HEIGHT = 64;

function TimeColumn({
  items,
  hourHeight = HOUR_HEIGHT,
  now,
  onSelect,
  spacious = false,
}: {
  items: CalItem[];
  hourHeight?: number;
  now: Date | null;
  onSelect: () => void;
  spacious?: boolean;
}) {
  const timed = items.filter((item) => !item.allDay && item.startTime);
  const laidOut = layoutTimedRanges(timed);
  const nowMinutes = now ? now.getHours() * 60 + now.getMinutes() : 0;

  return (
    <div
      onClick={onSelect}
      className="relative cursor-pointer border-l border-border"
      style={{ height: WEEK_HOURS.length * hourHeight }}
    >
      {WEEK_HOURS.map((hour) => (
        <div
          key={hour}
          className="absolute inset-x-0 border-b border-border/80"
          style={{ top: (hour - WEEK_START_HOUR) * hourHeight, height: hourHeight }}
        />
      ))}
      {now ? (
        <div
          className="absolute inset-x-0 z-10 h-0.5 bg-brand-600"
          style={{ top: ((nowMinutes - WEEK_START_HOUR * 60) / 60) * hourHeight }}
        >
          <span className="absolute -left-1.5 -top-1.5 h-3 w-3 rounded-full bg-brand-600" />
        </div>
      ) : null}
      {laidOut.map(({ item, col, colCount }) => {
        const { top, height } = timeBlockOffset(
          item.startTime ?? "07:00",
          item.endTime ?? item.startTime ?? "08:00",
          WEEK_START_HOUR,
          WEEK_END_HOUR,
          hourHeight,
        );
        return (
          <div
            key={item.id}
            title={item.title}
            className={cn(
              "absolute z-20 overflow-hidden rounded-lg border px-1.5 py-1 text-left",
              STYLES[item.type].chip,
            )}
            style={{
              top,
              height,
              left: `calc(${(col / colCount) * 100}% + 2px)`,
              width: `calc(${100 / colCount}% - 4px)`,
            }}
          >
            <p className="truncate text-[10px] font-bold leading-tight">{item.title}</p>
            {spacious ? (
              <p className="truncate text-[10px] font-medium opacity-80">
                {item.startTime}
                {item.endTime ? ` – ${item.endTime}` : ""}
              </p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function HourLabels({ hourHeight }: { hourHeight: number }) {
  return (
    <div className="relative" style={{ height: WEEK_HOURS.length * hourHeight }}>
      {WEEK_HOURS.map((hour) => (
        <div
          key={hour}
          className="absolute right-2 -translate-y-2 text-[10px] font-semibold text-foreground/35"
          style={{ top: (hour - WEEK_START_HOUR) * hourHeight }}
        >
          {hour}:00
        </div>
      ))}
    </div>
  );
}

function ItemRow({
  item,
  t,
  showDate = false,
}: {
  item: CalItem;
  t: ReturnType<typeof useT>;
  showDate?: boolean;
}) {
  const locale = useLocale();
  const intlLocale = locale === "en" ? "en-US" : "es-CR";
  const when = item.allDay || !item.startTime ? t.agenda.events.form.allDay : item.startTime;
  const meta = [
    showDate ? dayTitle(parseISO(item.date), intlLocale) : null,
    when,
    item.location,
    item.group,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="flex w-full items-start gap-3 rounded-xl border border-transparent px-2 py-2">
      <span className={cn("mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full", STYLES[item.type].dot)} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-foreground">{item.title}</span>
        <span className="block truncate text-xs font-medium text-foreground/50">{meta}</span>
      </span>
      <span
        className={cn(
          "mt-0.5 shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold",
          STYLES[item.type].chip,
        )}
      >
        {typeLabel(t, item.type)}
      </span>
    </div>
  );
}

function IconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface text-foreground/70 transition-colors hover:bg-surface-muted hover:text-foreground"
    >
      {children}
    </button>
  );
}

function Chevron({ direction }: { direction: "left" | "right" }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d={direction === "left" ? "M15 18l-6-6 6-6" : "M9 18l6-6-6-6"}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ---------- helpers ---------- */

function parseISO(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
}

function dayTitle(date: Date, intlLocale: string): string {
  return capitalize(
    date.toLocaleDateString(intlLocale, { weekday: "long", day: "numeric", month: "long" }),
  );
}

function weekTitle(anchor: Date, intlLocale: string): string {
  const monday = mondayOf(anchor);
  const end = addDays(monday, 4);
  const startLabel = monday.toLocaleDateString(intlLocale, { day: "numeric" });
  const endLabel = end.toLocaleDateString(intlLocale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return capitalize(`${startLabel} – ${endLabel}`);
}

function weekdayLabels(locale: string): string[] {
  const intlLocale = locale === "en" ? "en-US" : "es-CR";
  return Array.from({ length: 7 }, (_, index) =>
    capitalize(new Date(2024, 0, 1 + index).toLocaleDateString(intlLocale, { weekday: "short" })),
  );
}

function typeLabel(t: ReturnType<typeof useT>, type: StyleKey): string {
  return t.agenda.events.types[type];
}

/** Current time, set after mount so SSR and hydration agree. */
function useNow(): Date | null {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setNow(new Date()));
    return () => cancelAnimationFrame(frame);
  }, []);
  return now;
}
