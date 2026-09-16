import "server-only";

import { cache } from "react";
import { createSessionClient } from "@/lib/supabase/session";
import { getTeacherSession } from "@/lib/auth/teacher-session";
import { loadTeacherTeachingScope } from "@/lib/dashboard/teacher-scope";
import type {
  ClassEducationalSupportFlags,
  EducationalSupport,
  EducationalSupportCategory,
} from "@/lib/educational-supports/model";

type SupportRow = {
  id: string;
  student_id: string;
  category: string;
  title: string;
  description: string;
  effective_from: string | null;
  effective_until: string | null;
  active: boolean;
  created_at: string;
};

type FlagRow = {
  student_id: string;
  active_count: number;
  needs_review: boolean;
};

function mapSupport(row: SupportRow): EducationalSupport {
  return {
    id: row.id,
    studentId: row.student_id,
    category: row.category as EducationalSupportCategory,
    title: row.title,
    description: row.description,
    effectiveFrom: row.effective_from,
    effectiveUntil: row.effective_until,
    active: row.active,
    createdAt: row.created_at,
  };
}

export const loadClassEducationalSupportFlags = cache(
  async (classId: string): Promise<ClassEducationalSupportFlags> => {
    const session = await getTeacherSession();
    if (!session) return {};

    const supabase = await createSessionClient();
    const { classIds } = await loadTeacherTeachingScope(supabase, session);
    if (!classIds.includes(classId)) return {};

    const { data, error } = await supabase.rpc("list_class_educational_support_flags", {
      p_class_id: classId,
    });

    if (error || !data) return {};

    const flags: ClassEducationalSupportFlags = {};
    for (const row of data as FlagRow[]) {
      flags[row.student_id] = {
        activeCount: row.active_count,
        needsReview: row.needs_review,
      };
    }
    return flags;
  },
);

export const loadStudentEducationalSupports = cache(
  async (studentId: string): Promise<EducationalSupport[]> => {
    const session = await getTeacherSession();
    if (!session) return [];

    const supabase = await createSessionClient();
    const { data, error } = await supabase.rpc("list_student_educational_supports", {
      p_student_id: studentId,
    });

    if (error || !data) return [];
    return (data as SupportRow[]).map(mapSupport);
  },
);
