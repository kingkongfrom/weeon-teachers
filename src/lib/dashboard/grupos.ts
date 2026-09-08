import "server-only";

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

  const counts = await Promise.all(
    groups.map(async (grupo) => {
      const { count } = await supabase
        .from("enrollments")
        .select("id", { count: "exact", head: true })
        .eq("class_id", grupo.id)
        .is("dropped_at", null);
      return count ?? 0;
    }),
  );

  return groups.map((grupo, index) => ({
    id: grupo.id,
    name: displayGrupoName(grupo),
    grade: grupo.grade,
    section: grupo.section,
    studentCount: counts[index] ?? 0,
  }));
}

export async function loadTeacherGrupo(classId: string): Promise<{
  grupo: TeacherGrupo;
  students: TeacherStudent[];
} | null> {
  const supabase = await createSessionClient();
  const { data: grupo, error } = await supabase
    .from("classes")
    .select("id, name, grade, section, active")
    .eq("id", classId)
    .maybeSingle();

  if (error || !grupo) return null;

  const { data: enrollmentRows } = await supabase
    .from("enrollments")
    .select("student_id, students(id, first_name, last_name, second_last_name, grade)")
    .eq("class_id", classId)
    .is("dropped_at", null);

  const students: TeacherStudent[] = [];
  for (const row of enrollmentRows ?? []) {
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
}
