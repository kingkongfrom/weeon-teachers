import "server-only";

import { cache } from "react";
import { createSessionClient } from "@/lib/supabase/session";
import { getTeacherSession } from "@/lib/auth/teacher-session";
import { loadTeacherTeachingScope } from "@/lib/dashboard/teacher-scope";
import { zonedDateParts } from "@/lib/dashboard/timezone";

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

type EventRow = {
  id: string;
  title: string;
  event_type: string;
  date: string;
  end_date: string | null;
  all_day: boolean;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  description: string | null;
  group_id: string | null;
  subject_id: string | null;
  lesson_id: string | null;
};

const EVENT_COLUMNS =
  "id, title, event_type, date, end_date, all_day, start_time, end_time, location, description, group_id, subject_id, lesson_id";

function toEventType(value: string): CalendarEventType {
  const known: CalendarEventType[] = [
    "institutional",
    "academic",
    "meeting",
    "holiday",
    "activity",
    "exam",
  ];
  return known.includes(value as CalendarEventType) ? (value as CalendarEventType) : "academic";
}

async function withGroupNames(
  supabase: Awaited<ReturnType<typeof createSessionClient>>,
  rows: EventRow[],
): Promise<TeacherCalendarEvent[]> {
  const groupIds = [...new Set(rows.map((row) => row.group_id).filter((id): id is string => !!id))];
  const names = new Map<string, string>();
  if (groupIds.length > 0) {
    const { data } = await supabase.from("classes").select("id, name, grade, section").in("id", groupIds);
    for (const row of data ?? []) {
      const label =
        row.name?.trim() ||
        [row.grade, row.section].filter(Boolean).join("").toUpperCase() ||
        "Grupo";
      names.set(row.id, label);
    }
  }

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    eventType: toEventType(row.event_type),
    date: row.date,
    endDate: row.end_date,
    allDay: row.all_day,
    startTime: row.start_time,
    endTime: row.end_time,
    location: row.location,
    description: row.description,
    groupId: row.group_id,
    groupName: row.group_id ? names.get(row.group_id) ?? null : null,
    subjectId: row.subject_id,
    lessonId: row.lesson_id,
  }));
}

function isoDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/**
 * Upcoming institution events the teacher can see (school-wide, teacher-facing,
 * or their groups). Read-only — the school creates and manages these.
 */
export const loadUpcomingEvents = cache(async (): Promise<TeacherCalendarEvent[]> => {
  const session = await getTeacherSession();
  if (!session) return [];

  const supabase = await createSessionClient();
  const { data, error } = await supabase
    .from("calendar_events")
    .select(EVENT_COLUMNS)
    .gte("date", isoDate(new Date()))
    .order("date", { ascending: true })
    .order("start_time", { ascending: true, nullsFirst: true });

  if (error || !data) return [];
  return withGroupNames(supabase, data as EventRow[]);
});

/**
 * Every event the teacher can see (school-wide, teacher-facing, or their groups)
 * within a date range — the monthly calendar's source. Same RLS as
 * `loadUpcomingEvents`, just bounded to the visible month.
 */
export const loadEventsBetween = cache(
  async (startISO: string, endISO: string): Promise<TeacherCalendarEvent[]> => {
    const session = await getTeacherSession();
    if (!session) return [];

    const supabase = await createSessionClient();
    const { data, error } = await supabase
      .from("calendar_events")
      .select(EVENT_COLUMNS)
      .gte("date", startISO)
      .lte("date", endISO)
      .order("date", { ascending: true })
      .order("start_time", { ascending: true, nullsFirst: true });

    if (error || !data) return [];
    return withGroupNames(supabase, data as EventRow[]);
  },
);

/** Group events for the teacher's classes within a date range (Horarios week). */
export const loadGroupEventsBetween = cache(
  async (startISO: string, endISO: string): Promise<TeacherCalendarEvent[]> => {
    const session = await getTeacherSession();
    if (!session) return [];

    const supabase = await createSessionClient();
    const { classIds } = await loadTeacherTeachingScope(supabase, session);
    if (classIds.length === 0) return [];

    const { data, error } = await supabase
      .from("calendar_events")
      .select(EVENT_COLUMNS)
      .in("group_id", classIds)
      .gte("date", startISO)
      .lte("date", endISO)
      .order("date", { ascending: true })
      .order("start_time", { ascending: true, nullsFirst: true });

    if (error || !data) return [];
    return withGroupNames(supabase, data as EventRow[]);
  },
);

export type TeacherExamDue = {
  id: string;
  title: string;
  /** School-local `YYYY-MM-DD`. */
  date: string;
  /** School-local `HH:MM`, or null when the due date has no time. */
  time: string | null;
  classId: string;
  className: string | null;
};

function displayClassName(row: {
  name: string | null;
  grade: string | null;
  section: string | null;
}): string {
  return (
    row.name?.trim() ||
    [row.grade, row.section].filter(Boolean).join("").toUpperCase() ||
    "Grupo"
  );
}

/**
 * The teacher's aula virtual **exams** (`kind = 'exam'`) with a due date in the
 * range — overlaid on the calendar next to institution events. `due_at` is a
 * timestamp, so the query is padded a day each side and rows are kept by their
 * school-local date. RLS scopes rows to the teacher's classes.
 */
export const loadExamDueBetween = cache(
  async (startISO: string, endISO: string): Promise<TeacherExamDue[]> => {
    const session = await getTeacherSession();
    if (!session) return [];

    const supabase = await createSessionClient();
    const from = new Date(`${startISO}T00:00:00`);
    from.setDate(from.getDate() - 1);
    const to = new Date(`${endISO}T00:00:00`);
    to.setDate(to.getDate() + 2);

    const { data, error } = await supabase
      .from("assessments")
      .select("id, class_id, title, due_at, classes(name, grade, section)")
      .eq("kind", "exam")
      .not("due_at", "is", null)
      .gte("due_at", isoDate(from))
      .lte("due_at", isoDate(to))
      .order("due_at", { ascending: true });

    if (error || !data) return [];

    const due: TeacherExamDue[] = [];
    for (const row of data) {
      const parts = row.due_at ? zonedDateParts(row.due_at) : null;
      if (!parts || parts.date < startISO || parts.date > endISO) continue;

      const klass = Array.isArray(row.classes) ? row.classes[0] : row.classes;
      due.push({
        id: row.id,
        title: row.title,
        date: parts.date,
        time: parts.time,
        classId: row.class_id,
        className: klass ? displayClassName(klass) : null,
      });
    }

    return due;
  },
);
