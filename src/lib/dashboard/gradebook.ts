import "server-only";

import { cache } from "react";
import { createSessionClient } from "@/lib/supabase/session";
import { getTeacherSession } from "@/lib/auth/teacher-session";

export type SubjectOption = {
  id: string; // subject_id, or a synthetic "lesson:<id>" when a lesson has no subject_id
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

/**
 * Derives the signed-in teacher's gradebook context from their assignments:
 *  - Secundaria: a subject teacher owns the classes_lessons where
 *    `teacher_id` matches their teacher roster id.
 *  - Primaria: a homeroom teacher (`classes.teacher_profile_id`) owns every
 *    subject of their class, including lessons with no specific teacher.
 *
 * Each class carries the subjects the teacher actually teaches, so the UI can
 * render (class, subject) gradebooks with a single uniform model — no manual
 * role toggle. `mode` is inferred from the data for a sensible default order.
 */
export const loadGradebookContext = cache(
  async (): Promise<GradebookContext> => {
  const session = await getTeacherSession();
  if (!session) return { classes: [], mode: "mixed" };

  const sessionClient = await createSessionClient();

  const { data: teacherRows } = await sessionClient
    .from("teachers")
    .select("id")
    .eq("profile_id", session.userId)
    .is("deleted_at", null);
  const teacherIds = (teacherRows ?? []).map((row) => row.id);
  // Primaria homeroom: the admin portal assigns a class to a teacher via
  // `classes.teacher_id` (roster id); the login backfill also sets
  // `classes.teacher_profile_id`. Accept either so the gradebook resolves.
  const isHomeroom = (klass: { teacher_id: string | null; teacher_profile_id: string | null }) =>
    (klass.teacher_profile_id !== null && klass.teacher_profile_id === session.userId) ||
    (klass.teacher_id !== null && teacherIds.includes(klass.teacher_id));

  // A school admin teaches no specific class but can see the whole institution,
  // so gradebook context for an admin lists every class (tenant-wide) with its
  // lessons. Teachers are scoped to the classes/subjects they actually own.
  const isAdmin = session.role === "admin";

  // Collect every class we want to present, with its <id, name, grade, section>.
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

  if (isAdmin) {
    const { data: allClasses } = await sessionClient
      .from("classes")
      .select("id, name, grade, section, teacher_id, teacher_profile_id");
    const { data: allLessons } = await sessionClient
      .from("class_lessons")
      .select("id, class_id, title, color, subject_id, teacher_id, classes(id, name, grade, section, teacher_id, teacher_profile_id)");

    for (const row of allClasses ?? []) ensureClass(row);
    for (const row of allLessons ?? []) {
      const klass = Array.isArray(row.classes) ? row.classes[0] : row.classes;
      if (!klass) continue;
      ensureClass(klass);
      if (row.subject_id) {
        upsertSubject(row.class_id, { id: row.subject_id, name: "Materia", color: row.color, isSubject: true });
      } else {
        upsertSubject(row.class_id, { id: `lesson:${row.id}`, name: row.title || "Materia", color: row.color, isSubject: false });
      }
    }
  } else {
    // All lessons the teacher can reach, with class + subject (or lesson title).
    const { data: lessonRows } = await sessionClient
      .from("class_lessons")
      .select(
        "id, class_id, title, color, subject_id, teacher_id, classes(id, name, grade, section, teacher_id, teacher_profile_id)",
      );

    for (const row of lessonRows ?? []) {
      const klass = Array.isArray(row.classes) ? row.classes[0] : row.classes;
      if (!klass) continue;

      const homeroom = isHomeroom(klass);
      const ownsLesson = homeroom || (row.teacher_id !== null && teacherIds.includes(row.teacher_id));
      if (!ownsLesson) continue;

      ensureClass(klass);

      if (row.subject_id) {
        upsertSubject(row.class_id, { id: row.subject_id, name: "Materia", color: row.color, isSubject: true });
      } else {
        upsertSubject(row.class_id, { id: `lesson:${row.id}`, name: row.title || "Materia", color: row.color, isSubject: false });
      }
    }
  }

  // Resolve real subject ids -> names/colors from the subjects table (one query).
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
    .sort((a, b) => a.name.localeCompare(b.name, "es"));

  // Flag classes that still have exam columns not tied to a subject (legacy
  // rows created before subject scoping), so the UI can offer a "General" view
  // and the teacher is never missing pre-classification grades.
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

/**
 * Infers the teaching mode. Since administrators assign every group together
 * with its subject(s) per teacher, the class grade is the authoritative signal:
 * grades 1–6 are primaria (one teacher, many subjects in one class) and grades
 * 7–11/12 are secundaria (one subject across several classes). We fall back to
 * counting heuristics only when the grade is missing or ambiguous.
 */
function inferMode(classes: ClassOption[]): TeachingMode {
  if (classes.length === 0) return "mixed";

  // Primary is authoritative if it appears in the class grade. Secondary is
  // authoritative if a secondary grade is present and no primary grade is.
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

  // Ambiguous or missing grades → reflect the shape of the data.
  const subjectCount = new Set(classes.flatMap((cls) => cls.subjects.map((s) => s.id))).size;
  if (classes.length === 1 && classes[0].subjects.length > 1) return "primary";
  if (classes.length > 1 && subjectCount === 1) return "secondary";
  return "mixed";
}
