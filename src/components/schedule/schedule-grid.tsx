import {
  WEEKDAYS,
  type TeacherLesson,
  type Weekday,
} from "@/lib/dashboard/schedule";
import { getT } from "@/lib/i18n/server";
import { LessonCard } from "@/components/schedule/lesson-card";

/** Weekly timetable: one column per weekday; clicking a lesson previews it. */
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
                  <LessonCard
                    key={lesson.id}
                    lesson={lesson}
                    dayLabel={t.schedule.weekdays[index]}
                  />
                ))
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
