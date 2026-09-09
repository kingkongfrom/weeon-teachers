import "server-only";

import type { TeacherSession } from "@/lib/auth/teacher-session";
import { createSessionClient } from "@/lib/supabase/session";

/**
 * Roster `teachers.id` rows for the signed-in user.
 * Prefers `teacher_roster_ids()`; falls back to RLS-visible `teachers` rows.
 */
export async function loadTeacherRosterIds(
  supabase: Awaited<ReturnType<typeof createSessionClient>>,
  userId: string,
): Promise<string[]> {
  const { data: rpcData, error: rpcError } = await supabase.rpc("teacher_roster_ids");
  if (!rpcError && rpcData?.length) {
    return rpcData as string[];
  }

  const { data: linkedRows } = await supabase
    .from("teachers")
    .select("id")
    .eq("profile_id", userId)
    .is("deleted_at", null);
  if (linkedRows?.length) {
    return linkedRows.map((row) => row.id);
  }

  const { data: visibleRows } = await supabase
    .from("teachers")
    .select("id")
    .is("deleted_at", null);
  return (visibleRows ?? []).map((row) => row.id);
}

/**
 * Groups where this user has at least one timetable slot (`class_lessons.teacher_id`).
 * Falls back to `classes` RLS (`teaches_class`) when lesson rows are not readable yet.
 */
export async function loadAssignedClassIds(
  supabase: Awaited<ReturnType<typeof createSessionClient>>,
  teacherIds: string[],
): Promise<string[]> {
  if (teacherIds.length > 0) {
    const { data } = await supabase
      .from("class_lessons")
      .select("class_id")
      .in("teacher_id", teacherIds);

    const fromLessons = [...new Set((data ?? []).map((row) => row.class_id))];
    if (fromLessons.length > 0) return fromLessons;
  }

  const { data: classes } = await supabase
    .from("classes")
    .select("id")
    .eq("active", true);

  return (classes ?? []).map((row) => row.id);
}

export async function loadTeacherTeachingScope(
  supabase: Awaited<ReturnType<typeof createSessionClient>>,
  session: TeacherSession,
): Promise<{ teacherIds: string[]; classIds: string[] }> {
  const teacherIds = await loadTeacherRosterIds(supabase, session.userId);
  const classIds = await loadAssignedClassIds(supabase, teacherIds);
  return { teacherIds, classIds };
}
