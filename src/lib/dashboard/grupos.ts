import "server-only";

import { cache } from "react";
import { createSessionClient } from "@/lib/supabase/session";

export type TeacherGrupo = {
  id: string;
  name: string;
  grade: string | null;
  section: string | null;
  studentCount: number;
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
  const supabase = await createSessionClient();
  const { data, error } = await supabase
    .from("classes")
    .select("id, name, grade, section, active")
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

  // Single grouped count query instead of N+1 per group.
  const classIds = groups.map((g) => g.id);
  const countsById = new Map<string, number>();
  if (classIds.length > 0) {
    const { data: enrollCounts } = await supabase
      .from("enrollments")
      .select("class_id, id")
      .in("class_id", classIds)
      .is("dropped_at", null);
    for (const row of enrollCounts ?? []) {
      countsById.set(row.class_id, (countsById.get(row.class_id) ?? 0) + 1);
    }
  }

  return groups.map((grupo) => ({
    id: grupo.id,
    name: displayGrupoName(grupo),
    grade: grupo.grade,
    section: grupo.section,
    studentCount: countsById.get(grupo.id) ?? 0,
  }));
}

export const loadTeacherGrupo = cache(
  async (classId: string): Promise<{
    grupo: TeacherGrupo;
    students: TeacherStudent[];
  } | null> => {
  const supabase = await createSessionClient();

  // Run the class + enrollment queries concurrently to halve round-trips.
  const [grupoRes, enrollmentRes] = await Promise.all([
    supabase
      .from("classes")
      .select("id, name, grade, section, active")
      .eq("id", classId)
      .maybeSingle(),
    supabase
      .from("enrollments")
      .select("student_id, students(id, first_name, last_name, second_last_name, grade)")
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

  return {
    grupo: {
      id: grupo.id,
      name: displayGrupoName(grupo),
      grade: grupo.grade,
      section: grupo.section,
      studentCount: students.length,
    },
    students,
  };
  },
);
