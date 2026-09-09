import "server-only";

import { cache } from "react";
import { createSessionClient } from "@/lib/supabase/session";
import { getTeacherSession } from "@/lib/auth/teacher-session";
import { loadTeacherTeachingScope } from "@/lib/dashboard/teacher-scope";

export type SubjectOption = {
  id: string;
  name: string;
  color: string | null;
  isSubject: boolean;
};

export type ClassOption = {
  id: string;
  name: string;
  grade: string | null;
  section: string | null;
  subjects: SubjectOption[];
  hasLegacyExams: boolean;
};

export type TeachingMode = "primary" | "secondary" | "mixed";

export type GradebookContext = {
  classes: ClassOption[];
  mode: TeachingMode;
};

function displayClass(row: {
  name: string | null;
  grade: string | null;
  section: string | null;
}): string {
  if (row.name?.trim()) return row.name.trim();
  return `${row.grade ?? ""}${row.section ?? ""}`.trim() || "Grupo";
}

/** Gradebook classes/subjects scoped to `class_lessons.teacher_id` assignments. */
export const loadGradebookContext = cache(
  async (): Promise<GradebookContext> => {
  const session = await getTeacherSession();
  if (!session) return { classes: [], mode: "mixed" };

  const sessionClient = await createSessionClient();
  const { teacherIds, classIds } = await loadTeacherTeachingScope(sessionClient, session);
  if (teacherIds.length === 0 || classIds.length === 0) {
    return { classes: [], mode: "mixed" };
  }

  const { data: allLessonsRes } = await sessionClient
    .from("class_lessons")
    .select(
      "id, class_id, title, color, subject_id, teacher_id, classes(id, name, grade, section)",
    )
    .in("class_id", classIds)
    .in("teacher_id", teacherIds);

  const classesById = new Map<string, { id: string; name: string; grade: string | null; section: string | null }>();
  const subjectsByClass = new Map<string, Map<string, SubjectOption>>();

  const ensureClass = (cls: {
    id: string;
    name: string | null;
    grade: string | null;
    section: string | null;
  }) => {
    if (!classesById.has(cls.id)) {
      classesById.set(cls.id, {
        id: cls.id,
        name: displayClass(cls),
        grade: cls.grade,
        section: cls.section,
      });
    }
    if (!subjectsByClass.has(cls.id)) subjectsByClass.set(cls.id, new Map());
  };

  const upsertSubject = (classId: string, subject: SubjectOption) => {
    const byClass = subjectsByClass.get(classId)!;
    if (!byClass.has(subject.id)) byClass.set(subject.id, subject);
  };

  for (const row of allLessonsRes ?? []) {
    const klass = Array.isArray(row.classes) ? row.classes[0] : row.classes;
    if (!klass) continue;

    ensureClass(klass);

    if (row.subject_id) {
      upsertSubject(row.class_id, { id: row.subject_id, name: "Materia", color: row.color, isSubject: true });
    } else {
      upsertSubject(row.class_id, { id: `lesson:${row.id}`, name: row.title || "Materia", color: row.color, isSubject: false });
    }
  }

  const allSubjectIds = [...new Set(
    Array.from(subjectsByClass.values())
      .flatMap((m) => Array.from(m.values()))
      .filter((s) => s.isSubject)
      .map((s) => s.id),
  )];

  if (allSubjectIds.length > 0) {
    const { data: subjects } = await sessionClient
      .from("subjects")
      .select("id, name, color")
      .in("id", allSubjectIds);
    const byId = new Map((subjects ?? []).map((s) => [s.id, s]));
    for (const byClass of subjectsByClass.values()) {
      for (const subject of byClass.values()) {
        if (subject.isSubject) {
          const resolved = byId.get(subject.id);
          if (resolved) subject.name = resolved.name || subject.name;
          if (resolved?.color) subject.color = resolved.color ?? subject.color;
        }
      }
    }
  }

  const classes: Array<Omit<ClassOption, "hasLegacyExams">> = Array.from(classesById.values())
    .map((cls) => ({
      ...cls,
      subjects: Array.from(subjectsByClass.get(cls.id)?.values() ?? []).sort((a, b) =>
        a.name.localeCompare(b.name, "es"),
      ),
    }))
    .filter((cls) => cls.subjects.length > 0)
    .sort((a, b) => a.name.localeCompare(b.name, "es"));

  const legacyById = await detectLegacyExams(sessionClient, classes.map((c) => c.id));

  const enriched: ClassOption[] = classes.map((cls) => ({
    ...cls,
    hasLegacyExams: legacyById.has(cls.id),
  }));

  return { classes: enriched, mode: inferMode(enriched) };
  },
);

async function detectLegacyExams(
  supabase: Awaited<ReturnType<typeof createSessionClient>>,
  classIds: string[],
): Promise<Set<string>> {
  if (classIds.length === 0) return new Set();
  const { data } = await supabase
    .from("assignments")
    .select("class_id")
    .in("class_id", classIds)
    .is("subject_id", null);
  return new Set((data ?? []).map((row) => row.class_id));
}

function inferMode(classes: ClassOption[]): TeachingMode {
  if (classes.length === 0) return "mixed";

  let hasPrimary = false;
  let hasSecondary = false;
  for (const cls of classes) {
    const n = Number((cls.grade ?? "").replace(/°|º/g, "").trim());
    if (!Number.isFinite(n)) continue;
    if (n <= 6) hasPrimary = true;
    else if (n >= 7) hasSecondary = true;
  }

  if (hasPrimary && !hasSecondary) return "primary";
  if (hasSecondary && !hasPrimary) return "secondary";

  const subjectCount = new Set(classes.flatMap((cls) => cls.subjects.map((s) => s.id))).size;
  if (classes.length === 1 && classes[0].subjects.length > 1) return "primary";
  if (classes.length > 1 && subjectCount === 1) return "secondary";
  return "mixed";
}
