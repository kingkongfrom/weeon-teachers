import { CalendarDays } from "lucide-react";
import Link from "next/link";
import {
  loadTeacherSchedule,
  WEEKDAYS,
  type TeacherLesson,
  type Weekday,
} from "@/lib/dashboard/schedule";

function timeLabel(hhmm: string): string {
  const [hours, minutes] = hhmm.split(":");
  if (!hours || !minutes) return hhmm;
  return `${Number(hours)}:${minutes}`;
}

function lessonWash(color: string): string {
  switch (color) {
    case "red":
      return "border-red-300/70 bg-red-50 dark:border-red-800/55 dark:bg-red-950/40";
    case "green":
      return "border-emerald-300/70 bg-emerald-50 dark:border-emerald-800/55 dark:bg-emerald-950/40";
    case "orange":
      return "border-orange-300/70 bg-orange-50 dark:border-orange-800/55 dark:bg-orange-950/40";
    case "purple":
      return "border-brand-300/70 bg-brand-50 dark:border-brand-700/55 dark:bg-brand-950/40";
    case "cyan":
      return "border-cyan-300/70 bg-cyan-50 dark:border-cyan-800/55 dark:bg-cyan-950/40";
    case "rose":
      return "border-rose-300/70 bg-rose-50 dark:border-rose-800/55 dark:bg-rose-950/40";
    case "amber":
      return "border-amber-300/70 bg-amber-50 dark:border-amber-800/55 dark:bg-amber-950/40";
    default:
      return "border-blue-300/70 bg-blue-50 dark:border-blue-800/55 dark:bg-blue-950/40";
  }
}

export default async function HorariosPage() {
  const lessons = await loadTeacherSchedule();

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="brand-page-title text-2xl text-foreground sm:text-3xl">Horarios</h1>
        <p className="text-sm font-medium text-foreground/55">
          Sus clases de la semana, por grupo.
        </p>
      </header>

      {lessons.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface px-6 py-16 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950/40 dark:text-brand-300">
            <CalendarDays className="h-6 w-6" strokeWidth={2.2} />
          </div>
          <p className="text-sm font-medium text-foreground/60">
            Aún no tiene lecciones asignadas en esta semana.
          </p>
        </div>
      ) : (
        <ScheduleGrid lessons={lessons} />
      )}
    </div>
  );
}

function ScheduleGrid({ lessons }: { lessons: TeacherLesson[] }) {
  const byDay = new Map<Weekday, TeacherLesson[]>();
  for (const day of WEEKDAYS) byDay.set(day.value, []);
  for (const lesson of lessons) {
    byDay.get(lesson.weekday)?.push(lesson);
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
      {WEEKDAYS.map((day) => {
        const dayLessons = byDay.get(day.value) ?? [];
        return (
          <section
            key={day.value}
            className="rounded-2xl border border-border bg-surface"
          >
            <div className="border-b border-border bg-background px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-foreground/50">
              {day.label}
            </div>
            <div className="flex flex-col gap-2 p-3">
              {dayLessons.length === 0 ? (
                <p className="px-1 py-2 text-xs font-medium text-foreground/40">
                  Sin clases
                </p>
              ) : (
                dayLessons.map((lesson) => (
                  <LessonCard key={lesson.id} lesson={lesson} />
                ))
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function LessonCard({ lesson }: { lesson: TeacherLesson }) {
  return (
    <Link
      href={`/grupos/${lesson.classId}`}
      className={`flex flex-col gap-1 rounded-xl border px-3 py-2.5 transition-transform hover:-translate-y-px ${lessonWash(lesson.color)}`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="truncate text-xs font-semibold text-foreground">
          {lesson.title}
        </span>
        <span className="shrink-0 text-[11px] font-semibold tabular-nums text-foreground/60">
          {timeLabel(lesson.startTime)}
        </span>
      </div>
      <span className="text-[11px] font-medium text-foreground/50">
        {lesson.groupName}
        {lesson.room ? ` · ${lesson.room}` : ""}
      </span>
    </Link>
  );
}
