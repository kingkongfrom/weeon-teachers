import "server-only";

import { createSessionClient } from "@/lib/supabase/session";
import { getTeacherSession } from "@/lib/auth/teacher-session";
import { loadTeacherTeachingScope } from "@/lib/dashboard/teacher-scope";
import {
  fullName,
  finalScoreStatus,
  type StudentGroupScore,
} from "@/lib/dashboard/student-summary";

export type TeacherStudentSummary = {
  id: string;
  firstName: string;
  lastName: string;
  secondLastName: string | null;
  grade: string | null;
};

export type TeacherStudentDetail = TeacherStudentSummary & {
  groups: Array<{ id: string; name: string }>;
};

export { fullName, finalScoreStatus };

/** Active students the session may view (RLS-scoped). */
export async function loadTeacherStudents(): Promise<TeacherStudentSummary[]> {
  const supabase = await createSessionClient();
  const { data, error } = await supabase
    .from("students")
    .select("id, first_name, last_name, second_last_name, grade")
    .is("deleted_at", null)
    .order("last_name")
    .order("first_name");

  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    secondLastName: row.second_last_name,
    grade: row.grade,
  }));
}

/** Single student by id, or null when not viewable (RLS-scoped). */
export async function loadTeacherStudent(
  studentId: string,
): Promise<TeacherStudentDetail | null> {
  const supabase = await createSessionClient();
  const { data: student, error } = await supabase
    .from("students")
    .select("id, first_name, last_name, second_last_name, grade")
    .eq("id", studentId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error || !student) return null;

  // Groups the student belongs to (RLS-scoped) — shown beneath the name.
  const { data: enrollmentRows } = await supabase
    .from("enrollments")
    .select("class_id, classes(id, name, grade, section, active)")
    .eq("student_id", studentId)
    .is("dropped_at", null);

  const groups: Array<{ id: string; name: string }> = [];
  for (const row of enrollmentRows ?? []) {
    const classes = row.classes as
      | { id: string; name: string | null; grade: string | null; section: string | null }
      | Array<{ id: string; name: string | null; grade: string | null; section: string | null }>
      | null;
    const klass = Array.isArray(classes) ? classes[0] : classes;
    if (!klass) continue;
    const name =
      klass.name?.trim() || `${klass.grade ?? ""}${klass.section ?? ""}`.trim();
    groups.push({ id: klass.id, name: name || "Grupo" });
  }

  return {
    id: student.id,
    firstName: student.first_name,
    lastName: student.last_name,
    secondLastName: student.second_last_name,
    grade: student.grade,
    groups,
  };
}

/** Paged list for /estudiantes: a window of visible students, each with their
 * groups and final scores, plus the total number of students. Bulk-loaded to
 * stay cheap; `total` drives the "load more" button. */
export async function loadStudentList(options?: {
  limit?: number;
  offset?: number;
}): Promise<{
  students: Array<{
    id: string;
    firstName: string;
    lastName: string;
    secondLastName: string | null;
    grade: string | null;
    groups: StudentGroupScore[];
  }>;
  total: number;
}> {
  const session = await getTeacherSession();
  if (!session) return { students: [], total: 0 };

  const supabase = await createSessionClient();
  const { classIds: assignedClassIds } = await loadTeacherTeachingScope(supabase, session);
  if (assignedClassIds.length === 0) return { students: [], total: 0 };

  const { data: allowedEnrollments } = await supabase
    .from("enrollments")
    .select("student_id")
    .in("class_id", assignedClassIds)
    .is("dropped_at", null);

  const allowedStudentIds = [...new Set((allowedEnrollments ?? []).map((row) => row.student_id))];
  if (allowedStudentIds.length === 0) return { students: [], total: 0 };

  const limit = options?.limit ?? 100;
  const offset = options?.offset ?? 0;
  const from = offset;
  const to = offset + limit - 1;

  const [countRes, pageRes] = await Promise.all([
    supabase
      .from("students")
      .select("id", { count: "exact", head: true })
      .in("id", allowedStudentIds)
      .is("deleted_at", null),
    supabase
      .from("students")
      .select("id, first_name, last_name, second_last_name, grade")
      .in("id", allowedStudentIds)
      .is("deleted_at", null)
      .order("last_name")
      .order("first_name")
      .range(from, to),
  ]);

  const total = countRes.count ?? 0;
  const studentRows = pageRes.data ?? [];

  const students = studentRows.map((row) => ({
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    secondLastName: row.second_last_name,
    grade: row.grade,
  }));
  if (students.length === 0) return { students: [], total };

  const studentIds = students.map((s) => s.id);

  const { data: enrollmentRows } = await supabase
    .from("enrollments")
    .select("student_id, class_id, classes(id, name, grade, section)")
    .in("student_id", studentIds)
    .is("dropped_at", null);

  const classIds = [...new Set((enrollmentRows ?? []).map((row) => row.class_id))]
    .filter((classId) => assignedClassIds.includes(classId));

  // Map: class_id -> { id, name } and class_id -> assignment max points.
  const classByName = new Map<string, string>();
  for (const row of enrollmentRows ?? []) {
    const raw = row as {
      classes:
        | { id: string; name: string | null; grade: string | null; section: string | null }
        | Array<{ id: string; name: string | null; grade: string | null; section: string | null }>
        | null;
    };
    const klass = Array.isArray(raw.classes) ? raw.classes[0] : raw.classes;
    if (!klass) continue;
    const name = klass.name?.trim() || `${klass.grade ?? ""}${klass.section ?? ""}`.trim() || "Grupo";
    if (!classByName.has(klass.id)) classByName.set(klass.id, name);
  }

  // Assignment id -> max points (for the divisor fallback) and student grades,
  // fetched concurrently (both depend only on classIds).
  const pointsByClass = new Map<string, Map<string, number | null>>();
  let assignments: Array<{ id: string; class_id: string; points: number | null }> = [];
  let grades: Array<{ assignment_id: string; class_id: string; student_id: string; mark: number; max_marks: number }> = [];
  if (classIds.length > 0) {
    const [assignRes, gradeRes] = await Promise.all([
      supabase.from("assignments").select("id, class_id, points").in("class_id", classIds),
      supabase
        .from("grades")
        .select("assignment_id, class_id, student_id, mark, max_marks")
        .in("class_id", classIds)
        .in("student_id", studentIds)
        .not("assignment_id", "is", null),
    ]);
    assignments = (assignRes.data ?? []) as typeof assignments;
    grades = (gradeRes.data ?? []) as typeof grades;
    for (const a of assignments) {
      if (!pointsByClass.has(a.class_id)) pointsByClass.set(a.class_id, new Map());
      pointsByClass.get(a.class_id)!.set(a.id, a.points);
    }
  }

  // Build a lookup: student_id -> class_id -> list of percentage scores.
  const scoresByStudent = new Map<string, Map<string, number[]>>();
  for (const grade of grades) {
    const maxFallback = pointsByClass.get(grade.class_id)?.get(grade.assignment_id) ?? null;
    const divisor = grade.max_marks ?? maxFallback ?? 100;
    if (divisor <= 0) continue;
    const pct = (grade.mark / divisor) * 100;
    if (!scoresByStudent.has(grade.student_id)) scoresByStudent.set(grade.student_id, new Map());
    const byClass = scoresByStudent.get(grade.student_id)!;
    if (!byClass.has(grade.class_id)) byClass.set(grade.class_id, []);
    byClass.get(grade.class_id)!.push(pct);
  }

  // student_id -> set of class_ids they are enrolled in.
  const enrolledByStudent = new Map<string, string[]>();
  for (const row of enrollmentRows ?? []) {
    if (!enrolledByStudent.has(row.student_id)) enrolledByStudent.set(row.student_id, []);
    enrolledByStudent.get(row.student_id)!.push(row.class_id);
  }

  return {
    students: students.map((student) => {
      const enrolled = (enrolledByStudent.get(student.id) ?? []).filter((classId) =>
        assignedClassIds.includes(classId),
      );
      const byClass = scoresByStudent.get(student.id) ?? new Map<string, number[]>();
      const groups = enrolled
        .map((classId) => {
          const scores = byClass.get(classId) ?? [];
          return {
            id: classId,
            name: classByName.get(classId) ?? "Grupo",
            finalScore:
              scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null,
            gradedExams: scores.length,
          };
        })
        .sort((a, b) => a.name.localeCompare(b.name, "es"));
      return { ...student, groups };
    }),
    total: total ?? 0,
  };
}
