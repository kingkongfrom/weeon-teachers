import Link from "next/link";
import {
  WEEKDAYS,
  type TeacherLesson,
  type Weekday,
} from "@/lib/dashboard/schedule";
import { getT } from "@/lib/i18n/server";

function timeLabel(hhmm: string): string {
  const [hours, minutes] = hhmm.split(":");
  if (!hours || !minutes) return hhmm;
  return `${Number(hours)}:${minutes}`;
}

/** Shared soft tints, matched to the panel cards so the grid reads as one
 * system. Keys mirror the calendar LESSON_COLORS names. */
const LESSON_TONE: Record<string, string> = {
  red: "bg-[#f6d4dd] dark:bg-[#432830]",
  green: "bg-[#c4ecd6] dark:bg-[#1f3d2e]",
  orange: "bg-[#f7e3ba] dark:bg-[#443a20]",
  purple: "bg-[#dcd3f7] dark:bg-[#33295a]",
  cyan: "bg-[#c3ece6] dark:bg-[#1f3d3b]",
  rose: "bg-[#f6d4dd] dark:bg-[#432830]",
  amber: "bg-[#f7e3ba] dark:bg-[#443a20]",
  blue: "bg-[#c9d4fb] dark:bg-[#2a3151]",
};

/** Solid ink shades matching the panel cards. */
const CARD_INK = "text-[#1b2433] dark:text-white";
const CARD_INK_FAINT = "text-[#4c5563] dark:text-white/60";

/** Weekly timetable: one column per weekday, lesson tiles linking to the grupo. */
export async function ScheduleGrid({ lessons }: { lessons: TeacherLesson[] }) {
  const t = await getT();
  const byDay = new Map<Weekday, TeacherLesson[]>();
  for (const day of WEEKDAYS) byDay.set(day.value, []);
  for (const lesson of lessons) {
    byDay.get(lesson.weekday)?.push(lesson);
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
      {WEEKDAYS.map((day, index) => {
        const dayLessons = byDay.get(day.value) ?? [];
        return (
          <section
            key={day.value}
            className="flex flex-col gap-3 rounded-2xl bg-surface p-4 ring-1 ring-inset ring-black/5 dark:bg-[#2a3140] dark:ring-white/10"
          >
            <h3 className="text-sm font-bold uppercase tracking-wide text-foreground/70">
              {t.schedule.weekdays[index]}
            </h3>
            <div className="flex flex-col gap-2">
              {dayLessons.length === 0 ? (
                <p className="px-1 py-2 text-xs font-medium text-foreground/40">
                  {t.schedule.noClasses}
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
  const tone = LESSON_TONE[lesson.color] ?? LESSON_TONE.blue;

  return (
    <Link
      href={`/grupos/${lesson.classId}`}
      className={`flex flex-col gap-1 rounded-xl p-3 ring-1 ring-inset ring-black/5 transition-all hover:brightness-[0.96] dark:ring-white/10 dark:hover:brightness-110 ${tone} ${CARD_INK}`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="truncate text-sm font-semibold">{lesson.title}</span>
        <span className={`shrink-0 text-[11px] font-semibold tabular-nums ${CARD_INK_FAINT}`}>
          {timeLabel(lesson.startTime)}
        </span>
      </div>
      <span className={`text-[11px] font-medium ${CARD_INK_FAINT}`}>
        {lesson.groupName}
        {lesson.room ? ` · ${lesson.room}` : ""}
      </span>
    </Link>
  );
}
