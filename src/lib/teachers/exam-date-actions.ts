"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSessionClient } from "@/lib/supabase/session";
import { getT } from "@/lib/i18n/server";

export type ExamDateActionResult = { ok: true; id?: string } | { ok: false; error: string };

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const WEEKDAY_BY_JS_DAY = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

const saveSchema = z.object({
  id: z.string().uuid().optional(),
  classId: z.string().uuid(),
  subjectId: z.string().uuid().nullable(),
  lessonId: z.string().uuid(),
  title: z.string().trim().max(160),
  date: z.string().regex(datePattern),
  materialIds: z.array(z.string().uuid()).max(50).optional(),
});

function weekdayOfISO(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  return WEEKDAY_BY_JS_DAY[new Date(year, month - 1, day).getDay()] ?? "mon";
}

/**
 * Creates or updates an exam date. The date must fall on the weekday of the
 * chosen class period, and the period must belong to the class and (when set)
 * the exam's subject — so a Ciencias exam can only land on a Ciencias period.
 */
export async function saveExamDate(input: {
  id?: string;
  classId: string;
  subjectId: string | null;
  lessonId: string;
  title: string;
  date: string;
  materialIds?: string[];
}): Promise<ExamDateActionResult> {
  const t = await getT();
  const parsed = saveSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: t.examDates.errors.invalid };
  const value = parsed.data;

  const supabase = await createSessionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const tenantId = user?.app_metadata?.tenant_id ?? user?.user_metadata?.tenant_id;
  if (typeof tenantId !== "string") return { ok: false, error: t.examDates.errors.invalid };

  const { data: lesson, error: lessonError } = await supabase
    .from("class_lessons")
    .select("id, class_id, subject_id, weekday, start_time, end_time, room")
    .eq("id", value.lessonId)
    .eq("class_id", value.classId)
    .maybeSingle();
  if (lessonError || !lesson) return { ok: false, error: t.examDates.errors.invalid };

  if (weekdayOfISO(value.date) !== lesson.weekday) {
    return { ok: false, error: t.examDates.errors.weekday };
  }
  if (value.subjectId && lesson.subject_id && lesson.subject_id !== value.subjectId) {
    return { ok: false, error: t.examDates.errors.subject };
  }

  const payload = {
    tenant_id: tenantId,
    class_id: value.classId,
    subject_id: value.subjectId,
    lesson_id: value.lessonId,
    title: value.title,
    exam_date: value.date,
  };

  let examDateId: string;
  if (value.id) {
    examDateId = value.id;
    const { error } = await supabase
      .from("exam_dates")
      .update(payload)
      .eq("id", examDateId)
      .eq("class_id", value.classId);
    if (error) return { ok: false, error: t.examDates.errors.save };
  } else {
    const { data, error } = await supabase
      .from("exam_dates")
      .insert(payload)
      .select("id")
      .single();
    if (error || !data) return { ok: false, error: t.examDates.errors.save };
    examDateId = data.id;
  }

  await syncMaterials(supabase, {
    tenantId,
    examDateId,
    materialIds: value.materialIds ?? [],
  });

  await mirrorCalendarEvent(supabase, {
    tenantId,
    examDateId,
    lesson,
    title: value.title,
    date: value.date,
  });

  revalidatePath(`/aula-virtual/${value.classId}`);
  revalidatePath("/agenda");
  revalidatePath("/inicio");
  return { ok: true, id: examDateId };
}

export async function deleteExamDate(input: {
  classId: string;
  examDateId: string;
}): Promise<ExamDateActionResult> {
  const t = await getT();
  const parsed = z
    .object({ classId: z.string().uuid(), examDateId: z.string().uuid() })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: t.examDates.errors.invalid };

  const supabase = await createSessionClient();
  const { error } = await supabase
    .from("exam_dates")
    .delete()
    .eq("id", parsed.data.examDateId)
    .eq("class_id", parsed.data.classId);
  if (error) return { ok: false, error: t.examDates.errors.delete };

  revalidatePath(`/aula-virtual/${parsed.data.classId}`);
  revalidatePath("/agenda");
  return { ok: true };
}

/**
 * Mirrors the exam date onto `calendar_events` so parents and students see it in
 * their apps (their calendars read this table). One event per exam date, keyed by
 * `calendar_events.exam_date_id`. Best-effort: the mirror never blocks the save.
 */
async function mirrorCalendarEvent(
  supabase: Awaited<ReturnType<typeof createSessionClient>>,
  input: {
    tenantId: string;
    examDateId: string;
    lesson: {
      class_id: string;
      subject_id: string | null;
      start_time: string;
      end_time: string;
      room: string | null;
    };
    title: string;
    date: string;
  },
): Promise<void> {
  try {
    const { data: existing } = await supabase
      .from("calendar_events")
      .select("id")
      .eq("exam_date_id", input.examDateId)
      .maybeSingle();

    const payload = {
      title: input.title || "Examen",
      date: input.date,
      all_day: false,
      start_time: input.lesson.start_time,
      end_time: input.lesson.end_time,
      location: input.lesson.room,
      audience: "group",
      group_id: input.lesson.class_id,
      subject_id: input.lesson.subject_id,
    };

    if (existing?.id) {
      await supabase.from("calendar_events").update(payload).eq("id", existing.id);
      return;
    }

    await supabase.from("calendar_events").insert({
      tenant_id: input.tenantId,
      event_type: "exam",
      exam_date_id: input.examDateId,
      ...payload,
    });
  } catch {
    // `calendar_events.exam_date_id` not migrated yet — ignore.
  }
}

/** Mirrors the existing `class_materials` the exam points to. Best-effort. */
async function syncMaterials(
  supabase: Awaited<ReturnType<typeof createSessionClient>>,
  input: { tenantId: string; examDateId: string; materialIds: string[] },
): Promise<void> {
  try {
    await supabase.from("exam_date_materials").delete().eq("exam_date_id", input.examDateId);
    if (input.materialIds.length === 0) return;
    await supabase.from("exam_date_materials").insert(
      input.materialIds.map((materialId, index) => ({
        tenant_id: input.tenantId,
        exam_date_id: input.examDateId,
        material_id: materialId,
        position: index,
      })),
    );
  } catch {
    // Link table not migrated yet — ignore; the exam date still saves.
  }
}
