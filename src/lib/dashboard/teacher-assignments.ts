import "server-only";

import { createSessionClient } from "@/lib/supabase/session";

export type AssignedSubject = {
  id: string;
  name: string;
  color: string | null;
};

/**
 * Subjects the signed-in user teaches per group (`class_lessons.teacher_id` only).
 */
export async function loadTeacherSubjectsByClass(
  supabase: Awaited<ReturnType<typeof createSessionClient>>,
  teacherIds: string[],
  classIds: string[],
): Promise<Map<string, AssignedSubject[]>> {
  if (classIds.length === 0 || teacherIds.length === 0) return new Map();

  const { data: lessonsRes } = await supabase
    .from("class_lessons")
    .select("class_id, subject_id, teacher_id, subjects(id, name, color)")
    .in("class_id", classIds)
    .in("teacher_id", teacherIds)
    .not("subject_id", "is", null);

  const byClass = new Map<string, Map<string, AssignedSubject>>();

  for (const row of lessonsRes ?? []) {
    if (!row.subject_id) continue;

    const subjectRaw = row.subjects as
      | { id: string; name: string; color: string | null }
      | Array<{ id: string; name: string; color: string | null }>
      | null;
    const subject = Array.isArray(subjectRaw) ? subjectRaw[0] : subjectRaw;
    if (!subject?.id) continue;

    if (!byClass.has(row.class_id)) byClass.set(row.class_id, new Map());
    const subjectsForClass = byClass.get(row.class_id)!;
    if (!subjectsForClass.has(subject.id)) {
      subjectsForClass.set(subject.id, {
        id: subject.id,
        name: subject.name,
        color: subject.color,
      });
    }
  }

  const result = new Map<string, AssignedSubject[]>();
  for (const [classId, subjectsMap] of byClass) {
    result.set(
      classId,
      [...subjectsMap.values()].sort((a, b) => a.name.localeCompare(b.name, "es")),
    );
  }
  return result;
}
