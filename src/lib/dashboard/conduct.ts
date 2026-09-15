import "server-only";

import { cache } from "react";
import { createSessionClient } from "@/lib/supabase/session";
import { getTeacherSession } from "@/lib/auth/teacher-session";
import { loadTeacherTeachingScope } from "@/lib/dashboard/teacher-scope";
import type { ConductCategory, ConductKind, ConductRecord } from "@/lib/conduct/model";

type ConductRow = {
  id: string;
  student_id: string;
  occurred_on: string;
  kind: ConductKind;
  category: ConductCategory;
  description: string;
  points: number;
  created_at: string;
  profiles: { name: string | null } | { name: string | null }[] | null;
};

function mapRow(row: ConductRow): ConductRecord {
  const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
  return {
    id: row.id,
    studentId: row.student_id,
    occurredOn: row.occurred_on,
    kind: row.kind,
    category: row.category,
    description: row.description,
    points: row.points,
    recordedByName: profile?.name?.trim() || null,
    createdAt: row.created_at,
  };
}

/** All conduct entries for a class the signed-in teacher may view. */
export const loadClassConduct = cache(
  async (classId: string): Promise<ConductRecord[]> => {
    const session = await getTeacherSession();
    if (!session) return [];

    const supabase = await createSessionClient();
    const { classIds } = await loadTeacherTeachingScope(supabase, session);
    if (!classIds.includes(classId)) return [];

    const { data, error } = await supabase
      .from("conduct_records")
      .select(
        "id, student_id, occurred_on, kind, category, description, points, created_at, profiles:recorded_by(name)",
      )
      .eq("class_id", classId)
      .order("occurred_on", { ascending: false })
      .order("created_at", { ascending: false });

    if (error || !data) return [];
    return (data as ConductRow[]).map(mapRow);
  },
);
