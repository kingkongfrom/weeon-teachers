/**
 * Locale-agnostic schedule types shared by server loaders and client views.
 * No `server-only` here — client components import from this module.
 */

export type Weekday = "mon" | "tue" | "wed" | "thu" | "fri";

/** Display order and default (Spanish) labels; UI translates via the catalog. */
export const WEEKDAYS: { value: Weekday; label: string; short: string }[] = [
  { value: "mon", label: "Lunes", short: "Lun" },
  { value: "tue", label: "Martes", short: "Mar" },
  { value: "wed", label: "Miércoles", short: "Mié" },
  { value: "thu", label: "Jueves", short: "Jue" },
  { value: "fri", label: "Viernes", short: "Vie" },
];

export type TeacherLesson = {
  id: string;
  classId: string;
  /** Gradebook materia key — `subjects.id` or `lesson:<class_lessons.id>`. */
  gradebookSubjectId: string;
  groupName: string;
  title: string;
  grade: string | null;
  section: string | null;
  studentCount: number;
  weekday: Weekday;
  startTime: string;
  endTime: string;
  room: string | null;
  color: string;
};
