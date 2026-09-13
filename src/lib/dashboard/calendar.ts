import "server-only";

import { cache } from "react";
import { createSessionClient } from "@/lib/supabase/session";
import { getTeacherSession } from "@/lib/auth/teacher-session";
import { loadTeacherTeachingScope } from "@/lib/dashboard/teacher-scope";

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
  subjectName: string | null;
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

async function decorate(
  supabase: Awaited<ReturnType<typeof createSessionClient>>,
  rows: EventRow[],
): Promise<TeacherCalendarEvent[]> {
  const groupIds = [...new Set(rows.map((row) => row.group_id).filter((id): id is string => !!id))];
  const subjectIds = [
    ...new Set(rows.map((row) => row.subject_id).filter((id): id is string => !!id)),
  ];

  const groupNames = new Map<string, string>();
  if (groupIds.length > 0) {
    const { data } = await supabase.from("classes").select("id, name, grade, section").in("id", groupIds);
    for (const row of data ?? []) {
      const label =
        row.name?.trim() ||
        [row.grade, row.section].filter(Boolean).join("").toUpperCase() ||
        "Grupo";
      groupNames.set(row.id, label);
    }
  }

  const subjectNames = new Map<string, string>();
  if (subjectIds.length > 0) {
    const { data } = await supabase.from("subjects").select("id, name").in("id", subjectIds);
    for (const row of data ?? []) subjectNames.set(row.id, row.name);
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
    groupName: row.group_id ? groupNames.get(row.group_id) ?? null : null,
    subjectId: row.subject_id,
    subjectName: row.subject_id ? subjectNames.get(row.subject_id) ?? null : null,
    lessonId: row.lesson_id,
  }));
}

/** Events this teacher authored (exams/quizzes/activities), soonest first. */
export const loadMyCalendarEvents = cache(async (): Promise<TeacherCalendarEvent[]> => {
  const session = await getTeacherSession();
  if (!session) return [];

  const supabase = await createSessionClient();
  const { data, error } = await supabase
    .from("calendar_events")
    .select(EVENT_COLUMNS)
    .eq("created_by", session.userId)
    .order("date", { ascending: true })
    .order("start_time", { ascending: true, nullsFirst: true });

  if (error || !data) return [];
  return decorate(supabase, data as EventRow[]);
});

/** Group events (any author) for the teacher's classes within a date range. */
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
    return decorate(supabase, data as EventRow[]);
  },
);
