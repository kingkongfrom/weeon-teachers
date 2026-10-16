import "server-only";

import { cache } from "react";
import { getTeacherSession } from "@/lib/auth/teacher-session";
import { createSessionClient } from "@/lib/supabase/session";
import { WEEKDAYS, type Weekday } from "@/lib/dashboard/schedule";

/** One scheduled period a class meets in — the slots an exam date may use. */
export type ClassLessonDay = {
  lessonId: string;
  subjectId: string | null;
  subjectName: string | null;
  title: string;
  weekday: Weekday;
  startTime: string;
  endTime: string;
  room: string | null;
};

/** A defined exam date, with the period it is held in. */
export type ExamDate = {
  id: string;
  classId: string;
  subjectId: string | null;
  lessonId: string | null;
  title: string;
  /** `YYYY-MM-DD`. */
  date: string;
  weekday: Weekday | null;
  startTime: string | null;
  endTime: string | null;
  room: string | null;
  materialIds: string[];
};

const WEEKDAY_ORDER: Record<Weekday, number> = {
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
};

function normalizeWeekday(value: string | null): Weekday | null {
  if (!value) return null;
  return WEEKDAYS.some((day) => day.value === value) ? (value as Weekday) : null;
}

function weekdayOfISODate(value: string): Weekday | null {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  const jsDay = new Date(year, month - 1, day).getDay();
  const map: Record<number, Weekday | null> = {
    0: null,
    1: "mon",
    2: "tue",
    3: "wed",
    4: "thu",
    5: "fri",
    6: null,
  };
  return map[jsDay] ?? null;
}

/**
 * The class's scheduled periods (`class_lessons`), in weekday/time order.
 * `subjectId` narrows to a single subject — an exam for Ciencias must only
 * offer Ciencias periods, not every period the group has that day.
 * RLS scopes `class_lessons` to classes the teacher sees.
 */
export const loadClassLessonDays = cache(
  async (classId: string, subjectId?: string | null): Promise<ClassLessonDay[]> => {
    const session = await getTeacherSession();
    if (!session) return [];

    const supabase = await createSessionClient();
    let query = supabase
      .from("class_lessons")
      .select("id, subject_id, title, weekday, start_time, end_time, room, subjects(id, name)")
      .eq("class_id", classId)
      .order("start_time");
    if (subjectId) query = query.eq("subject_id", subjectId);

    const { data, error } = await query;
    if (error || !data) return [];

    const rows = data as Array<{
      id: string;
      subject_id: string | null;
      title: string;
      weekday: string;
      start_time: string;
      end_time: string;
      room: string | null;
      subjects: { id: string; name: string } | { id: string; name: string }[] | null;
    }>;

    const days: ClassLessonDay[] = [];
    for (const row of rows) {
      const weekday = normalizeWeekday(row.weekday);
      if (!weekday) continue;
      const subject = Array.isArray(row.subjects) ? row.subjects[0] : row.subjects;
      days.push({
        lessonId: row.id,
        subjectId: row.subject_id,
        subjectName: subject?.name ?? null,
        title: row.title,
        weekday,
        startTime: row.start_time,
        endTime: row.end_time,
        room: row.room,
      });
    }

    days.sort((a, b) => {
      const byDay = WEEKDAY_ORDER[a.weekday] - WEEKDAY_ORDER[b.weekday];
      if (byDay !== 0) return byDay;
      return a.startTime.localeCompare(b.startTime);
    });

    return days;
  },
);

/** Exam dates for a class, soonest first. RLS scopes to classes the teacher sees. */
export const loadClassExamDates = cache(async (classId: string): Promise<ExamDate[]> => {
  const session = await getTeacherSession();
  if (!session) return [];

  const supabase = await createSessionClient();
  const { data, error } = await supabase
    .from("exam_dates")
    .select(
      "id, class_id, subject_id, lesson_id, title, exam_date, class_lessons(weekday, start_time, end_time, room)",
    )
    .eq("class_id", classId)
    .order("exam_date", { ascending: true });

  if (error) {
    console.error("[exam-dates] loadClassExamDates failed", { classId, error: error.message });
    throw new Error(`loadClassExamDates: ${error.message}`);
  }
  if (!data) return [];

  const rows = data as Array<{
    id: string;
    class_id: string;
    subject_id: string | null;
    lesson_id: string | null;
    title: string;
    exam_date: string;
    class_lessons:
      | { weekday: string; start_time: string; end_time: string; room: string | null }
      | { weekday: string; start_time: string; end_time: string; room: string | null }[]
      | null;
  }>;

  if (rows.length === 0) return [];

  const materialIdsByExam = await loadExamMaterialIds(
    supabase,
    rows.map((row) => row.id),
  );

  return rows.map((row) => {
    const lesson = Array.isArray(row.class_lessons) ? row.class_lessons[0] : row.class_lessons;
    return {
      id: row.id,
      classId: row.class_id,
      subjectId: row.subject_id,
      lessonId: row.lesson_id,
      title: row.title,
      date: row.exam_date,
      weekday: lesson ? normalizeWeekday(lesson.weekday) : weekdayOfISODate(row.exam_date),
      startTime: lesson?.start_time ?? null,
      endTime: lesson?.end_time ?? null,
      room: lesson?.room ?? null,
      materialIds: materialIdsByExam.get(row.id) ?? [],
    };
  });
});

async function loadExamMaterialIds(
  supabase: Awaited<ReturnType<typeof createSessionClient>>,
  examIds: string[],
): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  if (examIds.length === 0) return map;
  const { data, error } = await supabase
    .from("exam_date_materials")
    .select("exam_date_id, material_id, position")
    .in("exam_date_id", examIds)
    .order("position", { ascending: true });
  if (error || !data) return map;
  for (const row of data as Array<{ exam_date_id: string; material_id: string }>) {
    const list = map.get(row.exam_date_id) ?? [];
    list.push(row.material_id);
    map.set(row.exam_date_id, list);
  }
  return map;
}
