import type { TeacherLesson } from "@/lib/dashboard/schedule";

export type LessonWeekday = "mon" | "tue" | "wed" | "thu" | "fri";

/** A schedulable class period a teacher can attach an event to. */
export type LessonChoice = {
  id: string;
  subject: string;
  groupName: string;
  weekday: LessonWeekday;
  startTime: string;
  endTime: string;
};

/** Maps the teacher's recurring schedule into event-attachable lesson choices. */
export function toLessonChoices(lessons: TeacherLesson[]): LessonChoice[] {
  return lessons.map((lesson) => ({
    id: lesson.id,
    subject: lesson.title,
    groupName: lesson.groupName,
    weekday: lesson.weekday,
    startTime: lesson.startTime,
    endTime: lesson.endTime,
  }));
}
