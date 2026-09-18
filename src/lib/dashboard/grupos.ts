import "server-only";

import { cache } from "react";
import { getTeacherSession } from "@/lib/auth/teacher-session";
import { createSessionClient } from "@/lib/supabase/session";
import { loadTeacherSubjectsByClass } from "@/lib/dashboard/teacher-assignments";
import { loadTeacherTeachingScope } from "@/lib/dashboard/teacher-scope";

export type GrupoSubject = {
  id: string;
  name: string;
  color: string | null;
};

export type TeacherGrupo = {
  id: string;
  name: string;
  grade: string | null;
  section: string | null;
  studentCount: number;
  parentCount: number;
  subjects: GrupoSubject[];
};

export type TeacherStudent = {
  id: string;
  firstName: string;
  lastName: string;
  secondLastName: string | null;
  grade: string | null;
};

function displayGrupoName(row: {
  name: string | null;
  grade: string | null;
  section: string | null;
}): string {
  if (row.name?.trim()) return row.name.trim();
  return `${row.grade ?? ""}${row.section ?? ""}`.trim() || "Grupo";
}

export async function loadTeacherGrupos(): Promise<TeacherGrupo[]> {
  const session = await getTeacherSession();
  if (!session) return [];

  const supabase = await createSessionClient();
  const { teacherIds, classIds } = await loadTeacherTeachingScope(supabase, session);
  if (classIds.length === 0) return [];

  const { data, error } = await supabase
    .from("classes")
    .select("id, name, grade, section, active")
    .in("id", classIds)
    .eq("active", true)
    .order("grade")
    .order("section");

  if (error || !data) return [];

  const groups = data as Array<{
    id: string;
    name: string | null;
    grade: string | null;
    section: string | null;
  }>;

  const visibleClassIds = groups.map((group) => group.id);
  const studentCountsById = new Map<string, number>();
  const parentIdsByClass = new Map<string, Set<string>>();
  let subjectsByClass = new Map<string, GrupoSubject[]>();

  if (visibleClassIds.length > 0) {
    const [enrollRes, subjectsRes] = await Promise.all([
      supabase
        .from("enrollments")
        .select("class_id, student_id, students(guardians)")
        .in("class_id", visibleClassIds)
        .is("dropped_at", null),
      loadTeacherSubjectsByClass(supabase, teacherIds, visibleClassIds),
    ]);

    for (const row of enrollRes.data ?? []) {
      studentCountsById.set(row.class_id, (studentCountsById.get(row.class_id) ?? 0) + 1);

      const raw = row as {
        class_id: string;
        students:
          | { guardians: unknown }
          | { guardians: unknown }[]
          | null;
      };
      const student = Array.isArray(raw.students) ? raw.students[0] : raw.students;
      const guardians = Array.isArray(student?.guardians) ? student.guardians : [];
      const classParents = parentIdsByClass.get(raw.class_id) ?? new Set<string>();
      for (const guardian of guardians) {
        if (!guardian || typeof guardian !== "object") continue;
        const id = (guardian as { id?: string }).id;
        if (typeof id === "string" && id.trim()) classParents.add(id.trim());
      }
      if (classParents.size > 0) parentIdsByClass.set(raw.class_id, classParents);
    }
    subjectsByClass = subjectsRes;
  }

  return groups.map((grupo) => ({
      id: grupo.id,
      name: displayGrupoName(grupo),
      grade: grupo.grade,
      section: grupo.section,
      studentCount: studentCountsById.get(grupo.id) ?? 0,
      parentCount: parentIdsByClass.get(grupo.id)?.size ?? 0,
      subjects: subjectsByClass.get(grupo.id) ?? [],
    }));
}

export const loadTeacherGrupo = cache(
  async (classId: string): Promise<{
    grupo: TeacherGrupo;
    students: TeacherStudent[];
  } | null> => {
  const session = await getTeacherSession();
  if (!session) return null;

  const supabase = await createSessionClient();
  const { teacherIds, classIds } = await loadTeacherTeachingScope(supabase, session);
  if (!classIds.includes(classId)) return null;

  const subjects =
    (await loadTeacherSubjectsByClass(supabase, teacherIds, [classId])).get(classId) ?? [];

  const [grupoRes, enrollmentRes] = await Promise.all([
    supabase
      .from("classes")
      .select("id, name, grade, section, active")
      .eq("id", classId)
      .maybeSingle(),
    supabase
      .from("enrollments")
      .select("student_id, students(id, first_name, last_name, second_last_name, grade, guardians)")
      .eq("class_id", classId)
      .is("dropped_at", null),
  ]);

  const grupo = grupoRes.data;
  if (grupoRes.error || !grupo) return null;

  const enrollmentRows = enrollmentRes.data ?? [];

  const students: TeacherStudent[] = [];
  for (const row of enrollmentRows) {
    const raw = row as {
      students:
        | {
            id: string;
            first_name: string;
            last_name: string;
            second_last_name: string | null;
            grade: string | null;
          }
        | {
            id: string;
            first_name: string;
            last_name: string;
            second_last_name: string | null;
            grade: string | null;
          }[]
        | null;
    };
    const student = Array.isArray(raw.students) ? raw.students[0] : raw.students;
    if (!student) continue;
    students.push({
      id: student.id,
      firstName: student.first_name,
      lastName: student.last_name,
      secondLastName: student.second_last_name,
      grade: student.grade,
    });
  }

  students.sort((a, b) =>
    `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`, "es"),
  );

  const parentIds = new Set<string>();
  for (const row of enrollmentRows) {
    const raw = row as {
      students:
        | { guardians: unknown }
        | { guardians: unknown }[]
        | null;
    };
    const student = Array.isArray(raw.students) ? raw.students[0] : raw.students;
    const guardians = Array.isArray(student?.guardians) ? student.guardians : [];
    for (const guardian of guardians) {
      if (!guardian || typeof guardian !== "object") continue;
      const id = (guardian as { id?: string }).id;
      if (typeof id === "string" && id.trim()) parentIds.add(id.trim());
    }
  }

  return {
    grupo: {
      id: grupo.id,
      name: displayGrupoName(grupo),
      grade: grupo.grade,
      section: grupo.section,
      studentCount: students.length,
      parentCount: parentIds.size,
      subjects,
    },
    students,
  };
  },
);
