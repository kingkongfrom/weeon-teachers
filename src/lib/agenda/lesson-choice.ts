export type LessonWeekday = "mon" | "tue" | "wed" | "thu" | "fri";

/** A scheduled class period an event/exam can be attached to. */
export type LessonChoice = {
  id: string;
  subject: string;
  groupName: string;
  weekday: LessonWeekday;
  startTime: string;
  endTime: string;
};
