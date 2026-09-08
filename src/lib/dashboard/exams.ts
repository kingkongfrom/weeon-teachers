import "server-only";

import { createSessionClient } from "@/lib/supabase/session";

export type ExamGrade = {
  mark: number;
  maxMarks: number;
};

export type ExamColumn = {
  id: string;
  title: string;
  points: number | null;
  grades: Record<string, ExamGrade>;
};

/**
 * Loads the grade columns (assignments) for a class + subject, with each
 * student's score keyed by student id. Resilient: if the `assignment_id` link
 * has not been migrated yet, it returns an empty list instead of breaking.
 *
 * `subjectId` selects the subject. Pass `null` to show exam columns not tied to
 * any subject (legacy rows), so pre-classification data is still reachable.
 */
export async function loadClassExams(
  classId: string,
  subjectId?: string | null,
): Promise<ExamColumn[]> {
  const supabase = await createSessionClient();

  let query = supabase
    .from("assignments")
    .select("id, title, points")
    .eq("class_id", classId);
  if (subjectId === null) {
    query = query.is("subject_id", null);
  } else if (subjectId) {
    query = query.eq("subject_id", subjectId);
  }
  const { data: assignments } = await query.order("created_at");

  const columns: ExamColumn[] = (assignments ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    points: row.points,
    grades: {},
  }));

  if (columns.length === 0) return columns;

  let grades: Array<{ assignment_id: string; student_id: string; mark: number; max_marks: number }> = [];
  try {
    const { data } = await supabase
      .from("grades")
      .select("assignment_id, student_id, mark, max_marks")
      .eq("class_id", classId)
      .not("assignment_id", "is", null);
    grades = (data ?? []) as typeof grades;
  } catch {
    return columns; // assignment_id column not present yet
  }

  const byId = new Map(columns.map((column) => [column.id, column]));
  for (const grade of grades) {
    const column = byId.get(grade.assignment_id);
    if (!column) continue;
    column.grades[grade.student_id] = { mark: grade.mark, maxMarks: grade.max_marks };
  }

  return columns;
}
