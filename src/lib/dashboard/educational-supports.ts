import "server-only";

import { cache } from "react";
import { createSessionClient } from "@/lib/supabase/session";
import { getTeacherSession } from "@/lib/auth/teacher-session";
import { loadTeacherTeachingScope } from "@/lib/dashboard/teacher-scope";
import type {
  ClassEducationalSupportFlags,
  EducationalSupport,
  EducationalSupportCategory,
  EducationalSupportSubjectScope,
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
  subject_scope: string;
  subject_ids: string[] | null;
  subject_labels: string[] | null;
  created_at: string;
};

type FlagRow = {
  student_id: string;
  active_count: number;
  needs_review: boolean;
  needs_period_registration: boolean;
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
    subjectScope: row.subject_scope as EducationalSupportSubjectScope,
    subjectIds: row.subject_ids ?? [],
    subjectLabels: row.subject_labels ?? [],
    createdAt: row.created_at,
  };
}

export const loadClassEducationalSupportFlags = cache(
  async (
    classId: string,
    options?: { subjectId?: string | null; conduct?: boolean },
  ): Promise<ClassEducationalSupportFlags> => {
    const session = await getTeacherSession();
    if (!session) return {};

    const supabase = await createSessionClient();
    const { classIds } = await loadTeacherTeachingScope(supabase, session);
    if (!classIds.includes(classId)) return {};

    const { data, error } = await supabase.rpc("list_class_educational_support_flags", {
      p_class_id: classId,
      p_subject_id: options?.conduct ? null : (options?.subjectId ?? null),
      p_conduct: options?.conduct ?? false,
    });

    if (error || !data) return {};

    const flags: ClassEducationalSupportFlags = {};
    for (const row of data as FlagRow[]) {
      flags[row.student_id] = {
        activeCount: row.active_count,
        needsReview: row.needs_review,
        needsPeriodRegistration: row.needs_period_registration,
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
