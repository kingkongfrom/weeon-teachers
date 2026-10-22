import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  CalendarPlus,
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudHail,
  CloudLightning,
  CloudMoon,
  CloudRain,
  CloudSnow,
  CloudSun,
  FileText,
  GraduationCap,
  Mail,
  MessageCircle,
  Moon,
  Presentation,
  ShieldCheck,
  Sun,
  UserCheck,
  type LucideIcon,
} from "lucide-react";
import { UnreadCountBadge } from "@/components/comms/unread-count-badge";
import type { TeacherCalendarEvent } from "@/lib/dashboard/calendar";
import type { TeacherLesson, Weekday } from "@/lib/dashboard/schedule";
import { schoolWeekday } from "@/lib/attendance/model";
import type { WeatherIconKind, WeatherSnapshot } from "@/lib/weather/met-norway";
import { cn } from "@/lib/utils";

const BRAND_NUMBER = {
  backgroundImage: "linear-gradient(100deg, #5e25cc 0%, #2b59ff 100%)",
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  color: "transparent",
} as const;

const WEEKDAY_INDEX: Record<Weekday, number> = {
  mon: 0,
  tue: 1,
  wed: 2,
  thu: 3,
  fri: 4,
};

export type TeacherMorningCopy = {
  accessTitle: string;
  quickAttendance: string;
  quickConduct: string;
  quickNewExam: string;
  messages: string;
  circulares: string;
  communicationLabel: string;
  grades: string;
  agenda: string;
  classroom: string;
  communication: string;
  noEvents: string;
  todayTitle: string;
  todayEmpty: string;
  weekendEmpty: string;
  viewFullSchedule: string;
};

type TeacherMorningProps = {
  locale: "es" | "en";
  todayISO: string;
  weekLabels: string[];
  lessons: TeacherLesson[];
  weekEvents: TeacherCalendarEvent[];
  todayEvents: TeacherCalendarEvent[];
  weather: WeatherSnapshot | null;
  unreadInboxCount: number;
  unreadChatCount: number;
  copy: TeacherMorningCopy;
  /** Rendered in the sheet's upper-right corner. */
  attention?: ReactNode;
};

/**
 * Teacher landing laid out as the school ERP's Resumen morning sheet: date and
 * weather top-left, quick actions centre, schedule strip and comms shortcuts
 * below, access cards across the middle.
 */
export function TeacherMorning({
  locale,
  todayISO,
  lessons,
  weekEvents,
  todayEvents,
  weather,
  unreadInboxCount,
  unreadChatCount,
  copy,
  attention,
}: TeacherMorningProps) {
  const lang = locale === "en" ? "en-US" : "es-CR";
  const today = parseISO(todayISO);
  const week = schoolWeek(todayISO);
  const todayKey = schoolWeekday();
  const attendanceHref = attendanceClassHref(lessons, todayKey);
  const conductHref = conductClassHref(lessons, todayKey);

  return (
    <section className="relative flex w-full flex-col gap-10 py-2 morning-tablet:grid morning-tablet:grid-cols-[auto_1fr] morning-tablet:items-start morning-tablet:gap-x-6 morning-compact:-mt-5 morning-compact:grid morning-compact:grid-cols-[auto_minmax(0,1fr)] morning-compact:items-start morning-compact:gap-x-6 morning-compact:gap-y-6 morning-desktop:block morning-desktop:min-h-[70vh] morning-desktop:py-4">
      {attention ? (
        <div className="morning-tablet:col-start-2 morning-tablet:row-start-1 morning-tablet:self-start morning-tablet:justify-self-end morning-compact:col-start-2 morning-compact:row-start-1 morning-compact:self-start morning-compact:justify-self-end morning-desktop:absolute morning-desktop:right-0 morning-desktop:top-0 morning-desktop:w-[26rem]">
          {attention}
        </div>
      ) : null}

      <header className="morning-tablet:col-start-1 morning-tablet:row-start-1 morning-tablet:self-start morning-compact:col-start-1 morning-compact:row-start-1 morning-desktop:-mt-[10px]">
        <div className="flex flex-col">
          <p className="text-sm font-medium capitalize tracking-wide text-foreground/60 dark:text-foreground/45">
            {today.toLocaleDateString(lang, { weekday: "long" })}
          </p>
          <div className="flex items-center gap-3">
            <p
              className="brand-page-title text-[5.5rem] leading-none tracking-tight morning-compact:text-[4.43rem] morning-desktop:text-[7.5rem]"
              style={BRAND_NUMBER}
            >
              {today.getDate()}
            </p>
            {weather ? <ResumenWeather weather={weather} /> : null}
          </div>
          <p className="mt-1 text-xl capitalize text-foreground/70 dark:text-foreground/55">
            {`${today.toLocaleDateString(lang, { month: "long" })} ${today.getFullYear()}`}
          </p>
        </div>
      </header>

      <div className="hidden w-full flex-col items-center gap-2 morning-tablet:col-span-2 morning-tablet:row-start-2 morning-tablet:flex morning-tablet:justify-self-center morning-compact:col-start-1 morning-compact:col-span-2 morning-compact:row-start-2 morning-compact:-mt-[50px] morning-compact:flex morning-compact:w-full morning-compact:justify-self-center morning-compact:self-start morning-desktop:absolute morning-desktop:left-1/2 morning-desktop:top-[calc(50%+70px-50px-6rem-70px-20px-3rem-4rem)] morning-desktop:flex morning-desktop:-translate-x-1/2">
        <div className="flex flex-wrap items-center justify-center gap-2">
          {(
            [
              [copy.quickAttendance, UserCheck, attendanceHref],
              [copy.quickConduct, ShieldCheck, conductHref],
              [copy.quickNewExam, CalendarPlus, "/agenda/calendario"],
            ] as const
          ).map(([label, Icon, href]) => (
            <Link
              key={label}
              href={href}
              className="inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-[#2b59ff]/30 bg-surface px-3.5 py-2 text-sm font-semibold text-foreground/80 transition-colors hover:border-[#2b59ff]/50 hover:bg-[#2b59ff]/[0.06] hover:text-foreground dark:border-[#7aa2ff]/40 dark:text-foreground/70"
            >
              <Icon className="h-4 w-4 text-[#2b59ff]" aria-hidden />
              {label}
            </Link>
          ))}
        </div>
      </div>

      <div className="morning-tablet:col-span-2 morning-tablet:row-start-3 morning-compact:col-start-1 morning-compact:col-span-2 morning-compact:row-start-3 morning-compact:-mt-5 morning-compact:min-w-0 morning-compact:self-center morning-desktop:absolute morning-desktop:left-1/2 morning-desktop:top-[calc(50%+70px-50px-6rem-70px-20px-3rem)] morning-desktop:-translate-x-1/2">
        <p className="mb-3 text-center text-sm font-medium text-foreground/55 dark:text-foreground/40">
          {copy.accessTitle}
        </p>
        <div className="flex flex-wrap justify-center gap-3 morning-tablet:flex-nowrap morning-compact:flex-nowrap morning-desktop:flex-nowrap">
          {(
            [
              [copy.grades, GraduationCap, "/grupos"],
              [copy.agenda, CalendarDays, "/agenda"],
              [copy.classroom, Presentation, "/aula-virtual"],
            ] as const
          ).map(([label, Icon, href]) => (
            <Link
              key={label}
              href={href}
              className="flex min-w-[12rem] cursor-pointer flex-col items-center gap-2 rounded-2xl border border-[#2b59ff]/25 bg-[#2b59ff]/[0.07] px-6 py-8 transition-colors hover:bg-surface-muted/60 morning-tablet:min-w-0 morning-tablet:flex-1 morning-tablet:gap-3 morning-tablet:px-3 morning-tablet:py-7 morning-compact:min-w-0 morning-compact:flex-1 morning-compact:gap-3 morning-compact:px-3 morning-compact:py-7 dark:border-[rgba(56,100,152,0.45)] dark:bg-[#1D243B] dark:hover:bg-[#252E4A]"
            >
              <Icon
                className="h-9 w-9 text-[#2b59ff] morning-tablet:h-11 morning-tablet:w-11 morning-compact:h-11 morning-compact:w-11 dark:text-[#7aa2ff]"
                aria-hidden
              />
              <span className="text-sm text-foreground/65 morning-tablet:text-base morning-compact:text-base dark:text-white/75">
                {label}
              </span>
            </Link>
          ))}
        </div>
      </div>

      <div className="border-t border-border-strong pt-5 morning-compact:pt-4 morning-tablet:col-span-2 morning-tablet:row-start-4 morning-compact:col-span-2 morning-compact:row-start-4 morning-desktop:absolute morning-desktop:left-1/2 morning-desktop:top-[calc(50%+70px)] morning-desktop:w-2/3 morning-desktop:-translate-x-1/2 morning-desktop:-translate-y-1/2">
        <ol className="grid grid-cols-5 gap-2 morning-compact:gap-3">
          {week.map((iso) => {
            const day = parseISO(iso);
            const isToday = iso === todayISO;
            const titles = titlesOn(weekEvents, iso).slice(0, 2);
            return (
              <li key={iso} className="flex">
                <Link
                  href={`/agenda/calendario?view=day&date=${iso}`}
                  className="block h-full w-full rounded-xl px-1 py-2 transition-colors hover:bg-surface-muted/60 morning-compact:px-2 morning-compact:py-2"
                >
                  <p className="text-sm font-medium capitalize text-foreground/65 morning-compact:text-base dark:text-foreground/50">
                    {day.toLocaleDateString(lang, { weekday: "long" })}
                  </p>
                  <p
                    className={cn(
                      "mt-1 text-2xl font-semibold tabular-nums leading-none morning-compact:text-3xl",
                      !isToday && "text-foreground/80 dark:text-foreground/70",
                    )}
                    style={isToday ? BRAND_NUMBER : undefined}
                  >
                    {day.getDate()}
                  </p>
                  {titles.length > 0 ? (
                    <p className="mt-2 line-clamp-2 text-[11px] leading-snug text-foreground/60 morning-compact:text-xs dark:text-foreground/45">
                      {titles.join(" · ")}
                    </p>
                  ) : (
                    <span className="mt-2 block h-4 morning-compact:h-5" aria-hidden />
                  )}
                </Link>
              </li>
            );
          })}
        </ol>

        <p className="mt-4 text-center text-sm font-medium text-foreground/55 morning-compact:mt-3 dark:text-foreground/40">
          {copy.communicationLabel}
        </p>
        <div className="mt-[13px] flex flex-wrap justify-center gap-2">
          {(
            [
              [copy.messages, Mail, "/comunicacion/mensajes", "bg-[#2b59ff]/[0.08] border-[#2b59ff]/25", "text-[#2b59ff] dark:text-[#7aa2ff]", unreadInboxCount],
              ["Chat", MessageCircle, "/comunicacion/chat", "bg-[#0f766e]/[0.08] border-[#0f766e]/25", "text-[#0f766e] dark:text-[#2dd4bf]", unreadChatCount],
              [copy.circulares, FileText, "/comunicacion/circulares", "bg-[#b45309]/[0.08] border-[#b45309]/25", "text-[#b45309] dark:text-[#fbbf24]", 0],
            ] as const
          ).map(([label, Icon, href, pillTone, iconTone, badge]) => (
            <Link
              key={label}
              href={href}
              className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium text-foreground/80 transition-colors hover:bg-surface-muted/60 dark:border-border dark:bg-surface dark:text-foreground/70 ${pillTone}`}
            >
              <Icon className={`h-4 w-4 ${iconTone}`} aria-hidden />
              {label}
              <UnreadCountBadge count={badge} />
            </Link>
          ))}
        </div>
      </div>

      <TodayPanel
        todayKey={todayKey}
        lessons={lessons}
        todayEvents={todayEvents}
        copy={copy}
        className="morning-tablet:col-span-2 morning-tablet:row-start-5 morning-compact:col-span-2 morning-compact:row-start-5 morning-desktop:absolute morning-desktop:left-1/2 morning-desktop:top-[calc(50%+70px+5rem+20px+30px+1rem)] morning-desktop:w-full morning-desktop:max-w-3xl morning-desktop:-translate-x-1/2"
      />
    </section>
  );
}

function TodayPanel({
  todayKey,
  lessons,
  todayEvents,
  copy,
  className,
}: {
  todayKey: string;
  lessons: TeacherLesson[];
  todayEvents: TeacherCalendarEvent[];
  copy: TeacherMorningCopy;
  className?: string;
}) {
  const isWeekend = todayKey === "sat" || todayKey === "sun";
  const sorted = [...lessons].sort((a, b) => {
    const dayDiff = WEEKDAY_INDEX[a.weekday] - WEEKDAY_INDEX[b.weekday];
    return dayDiff !== 0 ? dayDiff : a.startTime.localeCompare(b.startTime);
  });
  const todayLessons = isWeekend
    ? []
    : sorted.filter((lesson) => lesson.weekday === todayKey);

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="brand-page-title text-xl" style={BRAND_NUMBER}>
          {copy.todayTitle}
        </p>
        <Link
          href="/horarios"
          className="inline-flex items-center gap-1 text-xs font-semibold text-[#2b59ff] hover:underline"
        >
          {copy.viewFullSchedule}
          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </div>

      {todayLessons.length === 0 ? (
        <p className="text-sm text-foreground/60">
          {isWeekend ? copy.weekendEmpty : copy.todayEmpty}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {todayLessons.map((lesson) => (
            <li key={lesson.id}>
              <Link
                href={`/aula-virtual/${lesson.classId}?subject=${encodeURIComponent(lesson.gradebookSubjectId)}&tab=trabajo`}
                className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 transition-colors hover:bg-surface-muted/60"
              >
                <BookOpen className="h-4 w-4 shrink-0 text-[#2b59ff]" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {lesson.title}
                  </p>
                  <p className="truncate text-xs text-foreground/55">
                    {lesson.groupName}
                    {lesson.room ? ` · ${lesson.room}` : ""}
                  </p>
                </div>
                <span className="shrink-0 text-xs font-semibold tabular-nums text-foreground/55">
                  {timeLabel(lesson.startTime)}–{timeLabel(lesson.endTime)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {todayEvents.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {todayEvents.map((event) => (
            <li
              key={event.id}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#b45309]/25 bg-[#b45309]/[0.08] px-3 py-1.5 text-xs font-semibold text-[#b45309] dark:border-[#fbbf24]/30 dark:bg-[#fbbf24]/10 dark:text-[#fbbf24]"
            >
              <FileText className="h-3.5 w-3.5" aria-hidden />
              {event.title}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

const WEATHER_ICONS: Record<WeatherIconKind, LucideIcon> = {
  sun: Sun,
  moon: Moon,
  "cloud-sun": CloudSun,
  "cloud-moon": CloudMoon,
  cloud: Cloud,
  "cloud-drizzle": CloudDrizzle,
  "cloud-rain": CloudRain,
  "cloud-lightning": CloudLightning,
  "cloud-snow": CloudSnow,
  "cloud-hail": CloudHail,
  "cloud-fog": CloudFog,
};

/** Icon + temperature + range, matching the school ERP's Resumen widget. */
function ResumenWeather({ weather }: { weather: WeatherSnapshot }) {
  const Icon = WEATHER_ICONS[weather.icon];
  const iconTone =
    weather.icon === "sun" || weather.icon === "cloud-sun"
      ? "text-[#eab308]"
      : "text-[#2b59ff] dark:text-[#7aa2ff]";

  return (
    <div className="flex items-start gap-2">
      <Icon className={`mt-0.5 h-7 w-7 shrink-0 ${iconTone}`} aria-hidden />
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-xl font-semibold leading-none text-foreground">
          {weather.temperatureC}°C
        </span>
        <p className="text-xs text-foreground/50">
          Máx {weather.highC}° · Mín {weather.lowC}°
        </p>
      </div>
    </div>
  );
}

/**
 * Class that the attendance/conduct shortcuts open: the teacher's earliest
 * class today, otherwise the earliest class this week. Falls back to the
 * schedule page when the teacher has no assigned slots at all.
 */
function shortcutClassId(lessons: TeacherLesson[], todayKey: string): string | null {
  const sorted = [...lessons].sort((a, b) => {
    const dayDiff = WEEKDAY_INDEX[a.weekday] - WEEKDAY_INDEX[b.weekday];
    return dayDiff !== 0 ? dayDiff : a.startTime.localeCompare(b.startTime);
  });
  const todayLesson = sorted.find((lesson) => lesson.weekday === todayKey);
  return (todayLesson ?? sorted[0])?.classId ?? null;
}

function attendanceClassHref(lessons: TeacherLesson[], todayKey: string): string {
  const classId = shortcutClassId(lessons, todayKey);
  return classId ? `/aula-virtual/${classId}?tab=asistencia` : "/horarios";
}

/** Conducta has no aula-virtual tab yet, so it opens the group's conduct tab. */
function conductClassHref(lessons: TeacherLesson[], todayKey: string): string {
  const classId = shortcutClassId(lessons, todayKey);
  return classId ? `/grupos/${classId}?tab=conducta` : "/horarios";
}

function timeLabel(hhmm: string): string {
  const [hours, minutes] = hhmm.split(":");
  if (!hours || !minutes) return hhmm;
  return `${Number(hours)}:${minutes}`;
}

function parseISO(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1);
}

function isoOf(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function schoolWeek(todayISO: string): string[] {
  const monday = parseISO(todayISO);
  const weekday = monday.getDay();
  const shift = weekday === 0 ? -6 : 1 - weekday;
  monday.setDate(monday.getDate() + shift);
  return Array.from({ length: 5 }, (_, index) => {
    const day = new Date(monday);
    day.setDate(monday.getDate() + index);
    return isoOf(day);
  });
}

function titlesOn(events: TeacherCalendarEvent[], iso: string): string[] {
  return events
    .filter((event) => {
      const end = event.endDate && event.endDate >= event.date ? event.endDate : event.date;
      return event.date <= iso && end >= iso;
    })
    .map((event) => event.title);
}





