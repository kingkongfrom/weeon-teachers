"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSessionClient } from "@/lib/supabase/session";
import { getTeacherSession } from "@/lib/auth/teacher-session";
import { getT } from "@/lib/i18n/server";
import { ATTENDANCE_STATUS_LIST } from "@/lib/attendance/model";

export type AttendanceActionResult = { ok: true } | { ok: false; error: string };

const saveSchema = z.object({
  classId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  lessonId: z.string().uuid().nullable().optional(),
  entries: z
    .array(
      z.object({
        studentId: z.string().uuid(),
        status: z.enum(ATTENDANCE_STATUS_LIST),
      }),
    )
    .min(1)
    .max(500),
});

/** Upserts attendance for a class on a date. RLS limits writes to classes the
 * teacher manages (or a school admin) in their tenant. */
export async function saveAttendance(input: {
  classId: string;
  date: string;
  lessonId?: string | null;
  entries: { studentId: string; status: string }[];
}): Promise<AttendanceActionResult> {
  const t = await getT();
  const parsed = saveSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: t.attendance.errors.save };

  const session = await getTeacherSession();
  if (!session) return { ok: false, error: t.attendance.errors.save };

  const supabase = await createSessionClient();
  const rows = parsed.data.entries.map((entry) => ({
    tenant_id: session.tenantId,
    class_id: parsed.data.classId,
    student_id: entry.studentId,
    date: parsed.data.date,
    status: entry.status,
    marked_by: session.userId,
    class_lesson_id: parsed.data.lessonId ?? null,
  }));

  const { error } = await supabase
    .from("attendance_records")
    .upsert(rows, { onConflict: "tenant_id,class_id,student_id,date" });

  if (error) {
    console.error("[attendance] save failed:", error.code, error.message, error.details);
    return {
      ok: false,
      error:
        process.env.NODE_ENV === "development"
          ? `${t.attendance.errors.save} (${error.message})`
          : t.attendance.errors.save,
    };
  }

  revalidatePath(`/aula-virtual/${parsed.data.classId}`);
  return { ok: true };
}
