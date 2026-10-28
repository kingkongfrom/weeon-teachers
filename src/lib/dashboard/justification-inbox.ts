import "server-only";

import { cache } from "react";
import { getTeacherSession } from "@/lib/auth/teacher-session";
import { createSessionClient } from "@/lib/supabase/session";
import { signJustificationPaths } from "@/lib/dashboard/justification-urls";
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

/** Pending parent justifications for one group — the class header badge. */
export const loadJustificationCountForClass = cache(
  async (classId: string): Promise<number> => {
    const session = await getTeacherSession();
    if (!session) return 0;

    const supabase = await createSessionClient();
    const { count, error } = await supabase
      .from("attendance_records")
      .select("id", { count: "exact", head: true })
      .eq("class_id", classId)
      .eq("guardian_decision", "pending");
    if (error) return 0;
    return count ?? 0;
  },
);

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
  const paths = data
    .map((row) =>
      typeof row.guardian_attachment_path === "string" ? row.guardian_attachment_path.trim() : "",
    )
    .filter((path) => path.length > 0);
  const signed = await signJustificationPaths(supabase, paths);

  for (const row of data) {
    const status = normalizeAttendanceStatus(row.status);
    const note = typeof row.guardian_note === "string" ? row.guardian_note.trim() : "";
    if (!status || !note) continue;
    const attachmentPath =
      typeof row.guardian_attachment_path === "string" ? row.guardian_attachment_path.trim() : "";
    const attachmentUrl = attachmentPath ? (signed.get(attachmentPath) ?? null) : null;
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
