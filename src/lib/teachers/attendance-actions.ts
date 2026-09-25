"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSessionClient } from "@/lib/supabase/session";
import { getTeacherSession } from "@/lib/auth/teacher-session";
import { getT } from "@/lib/i18n/server";
import {
  ATTENDANCE_COMMENT_MAX,
  ATTENDANCE_STATUS_LIST,
  normalizeAttendanceComment,
} from "@/lib/attendance/model";

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
        comment: z.string().max(ATTENDANCE_COMMENT_MAX).nullable().optional(),
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
  entries: { studentId: string; status: string; comment?: string | null }[];
}): Promise<AttendanceActionResult> {
  const t = await getT();
  const parsed = saveSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: t.attendance.errors.save };

  const session = await getTeacherSession();
  if (!session) return { ok: false, error: t.attendance.errors.save };

  const supabase = await createSessionClient();
  const rows = parsed.data.entries.map((entry) => {
    const comment = normalizeAttendanceComment(entry.comment);
    return {
      tenant_id: session.tenantId,
      class_id: parsed.data.classId,
      student_id: entry.studentId,
      date: parsed.data.date,
      status: entry.status,
      marked_by: session.userId,
      class_lesson_id: parsed.data.lessonId ?? null,
      comment: entry.status === "present" ? null : comment,
    };
  });

  const { error } = await supabase.from("attendance_records").upsert(rows, {
    onConflict: "tenant_id,class_id,student_id,date",
    ignoreDuplicates: false,
  });

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

const decisionSchema = z.object({
  recordId: z.string().uuid(),
  decision: z.enum(["accepted", "rejected"]),
});

/** Accept flips the mark to justified. Reject keeps it and clears the alert. */
export async function decideAttendanceJustification(
  recordId: string,
  decision: "accepted" | "rejected",
): Promise<AttendanceActionResult> {
  const t = await getT();
  const parsed = decisionSchema.safeParse({ recordId, decision });
  if (!parsed.success) return { ok: false, error: t.attendance.errors.decide };

  const session = await getTeacherSession();
  if (!session) return { ok: false, error: t.attendance.errors.decide };

  const supabase = await createSessionClient();
  const { error } = await supabase.rpc("decide_attendance_justification", {
    p_record_id: parsed.data.recordId,
    p_decision: parsed.data.decision,
  });

  if (error) {
    console.error("[attendance] decision failed:", error.code, error.message);
    return { ok: false, error: t.attendance.errors.decide };
  }

  const { data: row } = await supabase
    .from("attendance_records")
    .select("class_id")
    .eq("id", parsed.data.recordId)
    .maybeSingle();

  revalidatePath("/inicio");
  revalidatePath("/aula-virtual/justificaciones");
  if (row?.class_id) revalidatePath(`/aula-virtual/${row.class_id}`);
  return { ok: true };
}
