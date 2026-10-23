/**
 * Locale-agnostic calendar types shared by server loaders and client views.
 * No `server-only` here — client components import from this module.
 */

export type CalendarEventType =
  | "institutional"
  | "academic"
  | "meeting"
  | "holiday"
  | "activity"
  | "exam";

export type TeacherCalendarEvent = {
  id: string;
  title: string;
  eventType: CalendarEventType;
  /** `YYYY-MM-DD` (no timezone). */
  date: string;
  endDate: string | null;
  allDay: boolean;
  startTime: string | null;
  endTime: string | null;
  location: string | null;
  description: string | null;
  groupId: string | null;
  groupName: string | null;
  subjectId: string | null;
  lessonId: string | null;
};

export type TeacherUpcomingEvaluation = {
  key: string;
  title: string;
  date: string;
  time: string | null;
  allDay: boolean;
  groupName: string | null;
  source: "calendar" | "aula";
  /** Badge on Horarios list — calendar event type or aula `exam`. */
  kind: "exam" | "activity";
};