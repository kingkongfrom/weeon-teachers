import "server-only";

import { cache } from "react";
import { createSessionClient } from "@/lib/supabase/session";
import { getTeacherSession } from "@/lib/auth/teacher-session";
import { loadTeacherTeachingScope } from "@/lib/dashboard/teacher-scope";

export type Weekday = "mon" | "tue" | "wed" | "thu" | "fri";

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

function normalizeWeekday(value: string): Weekday | null {
  return WEEKDAYS.some((day) => day.value === value) ? (value as Weekday) : null;
}

function displayGroupName(
  row: { name: string | null; grade: string | null; section: string | null },
): string {
  if (row.name?.trim()) return row.name.trim();
  const grade = (row.grade ?? "").replace(/°/g, "").trim();
  const section = (row.section ?? "").trim().toUpperCase();
  return [grade, section].filter(Boolean).join("") || "Grupo";
}

/** Weekly timetable slots assigned to the signed-in teacher. */
export const loadTeacherSchedule = cache(
  async (): Promise<TeacherLesson[]> => {
  const session = await getTeacherSession();
  if (!session) return [];

  const supabase = await createSessionClient();
  const { teacherIds, classIds } = await loadTeacherTeachingScope(supabase, session);
  if (teacherIds.length === 0 || classIds.length === 0) return [];

  const { data: lessonRows, error: lessonError } = await supabase
    .from("class_lessons")
    .select(
      "id, class_id, title, weekday, start_time, end_time, room, color, teacher_id, classes(id, name, grade, section)",
    )
    .in("class_id", classIds)
    .in("teacher_id", teacherIds)
    .order("weekday")
    .order("start_time");

  if (lessonError) return [];

  // Distinct enrolled students per class, for the lesson preview.
  const { data: enrollRows } = await supabase
    .from("enrollments")
    .select("class_id, student_id")
    .in("class_id", classIds)
    .is("dropped_at", null);
  const studentsByClass = new Map<string, Set<string>>();
  for (const row of enrollRows ?? []) {
    const set = studentsByClass.get(row.class_id) ?? new Set<string>();
    set.add(row.student_id);
    studentsByClass.set(row.class_id, set);
  }

  const lessons: TeacherLesson[] = [];
  for (const row of lessonRows ?? []) {
    const weekday = normalizeWeekday(row.weekday);
    if (!weekday) continue;

    const klass = row.classes as
      | {
          id: string;
          name: string | null;
          grade: string | null;
          section: string | null;
        }
      | Array<{
          id: string;
          name: string | null;
          grade: string | null;
          section: string | null;
        }>
      | null;
    const klassRow = Array.isArray(klass) ? klass[0] : klass;
    if (!klassRow) continue;

    lessons.push({
      id: row.id,
      classId: klassRow.id,
      groupName: displayGroupName(klassRow),
      title: row.title,
      grade: klassRow.grade,
      section: klassRow.section,
      studentCount: studentsByClass.get(klassRow.id)?.size ?? 0,
      weekday,
      startTime: row.start_time,
      endTime: row.end_time,
      room: row.room,
      color: row.color,
    });
  }

  return lessons.sort(
    (a, b) => a.startTime.localeCompare(b.startTime) || a.title.localeCompare(b.title, "es"),
  );
  },
);
