"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSessionClient } from "@/lib/supabase/session";
import { getTeacherSession } from "@/lib/auth/teacher-session";
import { getT } from "@/lib/i18n/server";

export type CalendarActionResult = { ok: true } | { ok: false; error: string };

const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
const WEEKDAY_BY_JS_DAY = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

const eventSchema = z
  .object({
    lessonId: z.string().uuid(),
    eventType: z.enum(["exam", "activity"]),
    title: z.string().trim().min(1).max(160),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    allDay: z.boolean(),
    startTime: z.string().regex(timePattern).nullable(),
    endTime: z.string().regex(timePattern).nullable(),
    location: z.string().trim().max(160).nullable(),
    description: z.string().trim().max(2000).nullable(),
  })
  .refine((value) => value.allDay || (value.startTime != null && value.endTime != null), {
    path: ["startTime"],
  })
  .refine(
    (value) => value.allDay || value.startTime == null || value.endTime == null || value.startTime < value.endTime,
    { path: ["endTime"] },
  );

export type CalendarEventInput = z.input<typeof eventSchema>;

/** Weekday key (`mon`…) for a `YYYY-MM-DD` date, in local time. */
function weekdayOfISO(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  return WEEKDAY_BY_JS_DAY[new Date(year, month - 1, day).getDay()] ?? "mon";
}

/**
 * Creates an exam/activity for one scheduled class period. The event is tied to
 * the `class_lessons` row (subject + group + weekday), so a Math exam can only
 * target a Math period; the date must fall on that lesson's weekday. Students
 * see it as an upcoming event (audience = group).
 */
export async function createCalendarEvent(input: CalendarEventInput): Promise<CalendarActionResult> {
  const t = await getT();
  const session = await getTeacherSession();
  if (!session) return { ok: false, error: t.agenda.errors.invalid };

  const parsed = eventSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: t.agenda.errors.invalid };
  const value = parsed.data;

  const supabase = await createSessionClient();
  const { data: lesson, error: lessonError } = await supabase
    .from("class_lessons")
    .select("id, class_id, subject_id, title, weekday, start_time, end_time")
    .eq("id", value.lessonId)
    .maybeSingle();

  if (lessonError || !lesson) return { ok: false, error: t.agenda.errors.invalid };

  if (weekdayOfISO(value.date) !== lesson.weekday) {
    return { ok: false, error: t.agenda.errors.weekday };
  }

  const { error } = await supabase.from("calendar_events").insert({
    tenant_id: session.tenantId,
    title: value.title,
    event_type: value.eventType,
    date: value.date,
    all_day: value.allDay,
    start_time: value.allDay ? null : value.startTime ?? lesson.start_time,
    end_time: value.allDay ? null : value.endTime ?? lesson.end_time,
    location: value.location,
    description: value.description,
    audience: "group",
    group_id: lesson.class_id,
    subject_id: lesson.subject_id,
    lesson_id: lesson.id,
  });

  if (error) return { ok: false, error: t.agenda.errors.generic };

  revalidatePath("/agenda/eventos");
  revalidatePath("/agenda");
  revalidatePath("/horarios");
  revalidatePath("/inicio");
  return { ok: true };
}

/** Removes an event the teacher authored (RLS enforces ownership). */
export async function deleteCalendarEvent(id: string): Promise<CalendarActionResult> {
  const t = await getT();
  const session = await getTeacherSession();
  if (!session) return { ok: false, error: t.agenda.errors.generic };

  const parsed = z.string().uuid().safeParse(id);
  if (!parsed.success) return { ok: false, error: t.agenda.errors.generic };

  const supabase = await createSessionClient();
  const { error } = await supabase.from("calendar_events").delete().eq("id", parsed.data);
  if (error) return { ok: false, error: t.agenda.errors.generic };

  revalidatePath("/agenda/eventos");
  revalidatePath("/agenda");
  revalidatePath("/horarios");
  revalidatePath("/inicio");
  return { ok: true };
}
