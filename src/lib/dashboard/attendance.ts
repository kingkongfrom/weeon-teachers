import "server-only";

import { cache } from "react";
import { getTeacherSession } from "@/lib/auth/teacher-session";
import { createSessionClient } from "@/lib/supabase/session";
import {
  emptyAttendanceCounts,
  normalizeAttendanceStatus,
  type AttendanceCounts,
  type AttendanceStatus,
} from "@/lib/attendance/model";

export type AttendanceMark = {
  status: AttendanceStatus;
  lessonId: string | null;
};

/** Attendance already recorded for a class on a date, keyed by student id. RLS
 * scopes rows to classes the teacher sees. */
export const loadClassAttendance = cache(
  async (classId: string, date: string): Promise<Record<string, AttendanceMark>> => {
    const session = await getTeacherSession();
    if (!session || !classId || !date) return {};

    const supabase = await createSessionClient();
    const { data, error } = await supabase
      .from("attendance_records")
      .select("student_id, status, class_lesson_id")
      .eq("class_id", classId)
      .eq("date", date);

    if (error || !data) return {};

    const marks: Record<string, AttendanceMark> = {};
    for (const row of data) {
      const status = normalizeAttendanceStatus(row.status);
      if (!status) continue;
      marks[row.student_id] = {
        status,
        lessonId: row.class_lesson_id,
      };
    }
    return marks;
  },
);

/** Attendance counts per student across every recorded date. Powers the
 * gradebook's read-only Asistencia column. */
export const loadClassAttendanceCounts = cache(
  async (classId: string): Promise<Record<string, AttendanceCounts>> => {
    const session = await getTeacherSession();
    if (!session || !classId) return {};

    const supabase = await createSessionClient();
    const { data, error } = await supabase
      .from("attendance_records")
      .select("student_id, status")
      .eq("class_id", classId);

    if (error || !data) return {};

    const byStudent: Record<string, AttendanceCounts> = {};
    for (const row of data) {
      const status = normalizeAttendanceStatus(row.status);
      if (!status) continue;
      const counts = byStudent[row.student_id] ?? emptyAttendanceCounts();
      counts[status] += 1;
      byStudent[row.student_id] = counts;
    }
    return byStudent;
  },
);
