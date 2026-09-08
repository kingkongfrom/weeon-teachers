import "server-only";

import { createSessionClient } from "@/lib/supabase/session";
import { getTeacherSession } from "@/lib/auth/teacher-session";

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

/**
 * Weekly schedule for the signed-in teacher. RLS already scopes class_lessons
 * to classes the teacher teaches (homeroom `classes.teacher_profile_id` or a
 * subject `class_lessons.teacher_id`). We additionally filter to lessons the
 * teacher owns:
 *  - secundaria: `class_lessons.teacher_id` → `teachers.profile_id = auth.uid()`
 *  - primaria:   homeroom `classes.teacher_profile_id = auth.uid()` (lesson may
 *                carry no specific teacher_id)
 */
export async function loadTeacherSchedule(): Promise<TeacherLesson[]> {
  const session = await getTeacherSession();
  if (!session) return [];

  const supabase = await createSessionClient();

  // Teacher roster rows linked to this profile (to match lesson teacher_id).
  const { data: teacherRows } = await supabase
    .from("teachers")
    .select("id")
    .eq("profile_id", session.userId)
    .is("deleted_at", null);
  const teacherIds = (teacherRows ?? []).map((row) => row.id);

  const { data: lessonRows, error } = await supabase
    .from("class_lessons")
    .select(
      "id, class_id, title, weekday, start_time, end_time, room, color, teacher_id, classes(id, name, grade, section, teacher_profile_id)",
    )
    .order("weekday")
    .order("start_time");

  if (error || !lessonRows) return [];

  const lessons: TeacherLesson[] = [];
  for (const row of lessonRows) {
    const weekday = normalizeWeekday(row.weekday);
    if (!weekday) continue;

    const klass = row.classes as
      | {
          id: string;
          name: string | null;
          grade: string | null;
          section: string | null;
          teacher_profile_id: string | null;
        }
      | Array<{
          id: string;
          name: string | null;
          grade: string | null;
          section: string | null;
          teacher_profile_id: string | null;
        }>
      | null;
    const klassRow = Array.isArray(klass) ? klass[0] : klass;
    if (!klassRow) continue;

    // This lesson belongs to the teacher if:
    //  - it carries their teacher_id (secundaria subject teacher), or
    //  - they are the homeroom teacher (primaria, lesson has no subject teacher).
    const ownsLesson =
      (row.teacher_id !== null && teacherIds.includes(row.teacher_id)) ||
      classroomTeacherOwns(klassRow.teacher_profile_id, session.userId);

    if (!ownsLesson) continue;

    lessons.push({
      id: row.id,
      classId: klassRow.id,
      groupName: displayGroupName(klassRow),
      title: row.title,
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
}

function classroomTeacherOwns(profileId: string | null, userId: string): boolean {
  return profileId !== null && profileId === userId;
}
