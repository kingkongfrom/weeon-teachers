import "server-only";

import { cache } from "react";
import { getTeacherSession } from "@/lib/auth/teacher-session";
import { createSessionClient } from "@/lib/supabase/session";
import { loadTeacherTeachingScope } from "@/lib/dashboard/teacher-scope";
import type { AttendanceStatus } from "@/lib/attendance/model";
import { normalizeAttendanceStatus } from "@/lib/attendance/model";

export type JustificationInboxItem = {
  recordId: string;
  classId: string;
  groupName: string;
  studentName: string;
  date: string;
  status: AttendanceStatus;
  note: string;
  attachmentUrl: string | null;
  attachmentPath: string | null;
  sentAt: string | null;
};

/** Parent justifications the teacher has not accepted or rejected yet. */
export const loadJustificationInbox = cache(async (): Promise<JustificationInboxItem[]> => {
  const session = await getTeacherSession();
  if (!session) return [];

  const supabase = await createSessionClient();
  const { classIds } = await loadTeacherTeachingScope(supabase, session);
  if (classIds.length === 0) return [];

  const { data, error } = await supabase
    .from("attendance_records")
    .select(
      "id, class_id, student_id, date, status, guardian_note, guardian_note_at, guardian_attachment_path",
    )
    .in("class_id", classIds)
    .eq("guardian_decision", "pending")
    .order("guardian_note_at", { ascending: true });

  if (error || !data || data.length === 0) {
    if (error) console.error("[attendance] justification inbox failed:", error.message);
    return [];
  }

  const studentIds = [...new Set(data.map((row) => row.student_id))];
  const [{ data: classes }, { data: students }] = await Promise.all([
    supabase.from("classes").select("id, name, grade, section").in("id", classIds),
    supabase.from("students").select("id, first_name, last_name").in("id", studentIds),
  ]);

  const groupName = new Map<string, string>();
  for (const row of classes ?? []) {
    groupName.set(
      row.id,
      row.name?.trim() || [row.grade, row.section].filter(Boolean).join("").toUpperCase() || "Grupo",
    );
  }
  const studentName = new Map<string, string>();
  for (const row of students ?? []) {
    studentName.set(row.id, `${row.last_name} ${row.first_name}`.trim());
  }

  const items: JustificationInboxItem[] = [];
  for (const row of data) {
    const status = normalizeAttendanceStatus(row.status);
    const note = typeof row.guardian_note === "string" ? row.guardian_note.trim() : "";
    if (!status || !note) continue;
    const attachmentPath =
      typeof row.guardian_attachment_path === "string" ? row.guardian_attachment_path.trim() : "";
    let attachmentUrl: string | null = null;
    if (attachmentPath) {
      const signed = await supabase.storage
        .from("attendance-justifications")
        .createSignedUrl(attachmentPath, 60 * 60);
      attachmentUrl = signed.data?.signedUrl ?? null;
    }
    items.push({
      recordId: row.id,
      classId: row.class_id,
      groupName: groupName.get(row.class_id) ?? "Grupo",
      studentName: studentName.get(row.student_id) ?? "Estudiante",
      date: row.date,
      status,
      note,
      attachmentUrl,
      attachmentPath: attachmentPath || null,
      sentAt: row.guardian_note_at,
    });
  }
  return items;
});
