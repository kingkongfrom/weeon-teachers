import "server-only";

import { createSessionClient } from "@/lib/supabase/session";

export type ExamGrade = {
  mark: number;
  maxMarks: number;
};

export type AssignmentKind =
  | "classwork"
  | "homework"
  | "exam"
  | "quiz"
  | "project";

export type AssignmentCategory = "classwork" | "evaluation";

export const ASSIGNMENT_KINDS: AssignmentKind[] = [
  "classwork",
  "homework",
  "exam",
  "quiz",
  "project",
];

function isKind(value: unknown): value is AssignmentKind {
  return typeof value === "string" && (ASSIGNMENT_KINDS as string[]).includes(value);
}

export function categoryFor(kind: AssignmentKind): AssignmentCategory {
  return kind === "exam" || kind === "quiz" ? "evaluation" : "classwork";
}

export type ExamColumn = {
  id: string;
  title: string;
  points: number | null;
  /** Precise type shown on the header (Tarea / Examen / …). */
  kind: AssignmentKind;
  /** Coarse group used for weighting. */
  category: AssignmentCategory;
  assessmentId: string | null;
  grades: Record<string, ExamGrade>;
};

type AssignmentRow = {
  id: string;
  title: string;
  points: number | null;
  category?: string | null;
  kind?: string | null;
  assessment_id?: string | null;
};

/**
 * Loads the grade columns (assignments) for a class + subject, with each
 * student's score keyed by student id. Resilient: if newer columns
 * (`kind`/`category`/`assessment_id`) are not migrated yet, it falls back to the
 * base select instead of breaking.
 *
 * `subjectId` selects the subject. Pass `null` to show columns not tied to any
 * subject (legacy rows), so pre-classification data is still reachable.
 */
export async function loadClassExams(
  classId: string,
  subjectId?: string | null,
): Promise<ExamColumn[]> {
  const supabase = await createSessionClient();

  let extendedQuery = supabase
    .from("assignments")
    .select("id, title, points, category, kind, assessment_id")
    .eq("class_id", classId);
  let baseQuery = supabase
    .from("assignments")
    .select("id, title, points")
    .eq("class_id", classId);

  if (subjectId === null) {
    extendedQuery = extendedQuery.is("subject_id", null);
    baseQuery = baseQuery.is("subject_id", null);
  } else if (subjectId) {
    extendedQuery = extendedQuery.eq("subject_id", subjectId);
    baseQuery = baseQuery.eq("subject_id", subjectId);
  }

  const [extendedRes, gradesRes] = await Promise.all([
    extendedQuery.order("created_at"),
    supabase
      .from("grades")
      .select("assignment_id, student_id, mark, max_marks")
      .eq("class_id", classId)
      .not("assignment_id", "is", null),
  ]);

  let assignments: AssignmentRow[];
  if (extendedRes.error) {
    const fallback = await baseQuery.order("created_at");
    assignments = (fallback.data ?? []) as AssignmentRow[];
  } else {
    assignments = (extendedRes.data ?? []) as AssignmentRow[];
  }

  const columns: ExamColumn[] = assignments.map((row) => {
    const kind = isKind(row.kind)
      ? row.kind
      : row.category === "evaluation"
        ? "exam"
        : "classwork";
    return {
      id: row.id,
      title: row.title,
      points: row.points,
      kind,
      category: categoryFor(kind),
      assessmentId: row.assessment_id ?? null,
      grades: {},
    };
  });

  if (columns.length === 0) return columns;

  const byId = new Map(columns.map((column) => [column.id, column]));
  for (const grade of gradesRes.data ?? []) {
    const column = byId.get(grade.assignment_id);
    if (!column) continue;
    column.grades[grade.student_id] = { mark: grade.mark, maxMarks: grade.max_marks };
  }

  return columns;
}
