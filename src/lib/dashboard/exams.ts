import "server-only";

import { createSessionClient } from "@/lib/supabase/session";

export type GradeStatus = "graded" | "missing";

export type ExamGrade = {
  mark: number;
  maxMarks: number;
  status: GradeStatus;
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

/**
 * The two rubro kinds a teacher can tag. `quiz` and `project` route to whichever
 * side of the rubric their category lands on: quizzes are evaluations, projects
 * are coursework. Keeps the resolver (two kinds) and the gradebook (five kinds)
 * talking without a second mapping table.
 */
export function kindForRouting(kind: AssignmentKind | null | undefined): "homework" | "exam" {
  return categoryFor(kind ?? "classwork") === "evaluation" ? "exam" : "homework";
}

export type ExamColumn = {
  id: string;
  title: string;
  points: number | null;
  /** Precise type shown on the header (Tarea / Examen / …). */
  kind: AssignmentKind;
  /** Coarse group used for weighting. */
  category: AssignmentCategory;
  /** Weighted rubro this column belongs to (null only for legacy rows). */
  rubroId: string | null;
  assessmentId: string | null;
  closedAt: string | null;
  grades: Record<string, ExamGrade>;
};

export type GradeRubro = {
  id: string;
  name: string;
  peso: number;
  position: number;
  archived: boolean;
  color: string | null;
  /** `grade_rubros.default_kind` — the kind of column this rubro holds. */
  defaultKind: "homework" | "exam" | null;
};

type AssignmentRow = {
  id: string;
  title: string;
  points: number | null;
  category?: string | null;
  kind?: string | null;
  rubro_id?: string | null;
  assessment_id?: string | null;
};

/**
 * Loads the rubros for a class + subject. Resilient by design: before the
 * `grade_rubros` migration is applied the query fails, and the gradebook falls
 * back to the legacy unweighted average instead of breaking.
 */
export async function loadClassRubros(
  classId: string,
  subjectId: string | null,
): Promise<GradeRubro[]> {
  if (!subjectId) return [];
  const supabase = await createSessionClient();

  const { data, error } = await supabase
    .from("grade_rubros")
    .select("id, name, peso, position, archived, color, default_kind")
    .eq("class_id", classId)
    .eq("subject_id", subjectId)
    .order("position");

  if (error) return [];

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    peso: row.peso,
    position: row.position,
    archived: row.archived,
    color: row.color,
    defaultKind:
      row.default_kind === "homework" || row.default_kind === "exam"
        ? row.default_kind
        : null,
  }));
}

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
    .select("id, title, points, category, kind, rubro_id, assessment_id, closed_at")
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
      .select("assignment_id, student_id, mark, max_marks, status")
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
      rubroId: row.rubro_id ?? null,
      assessmentId: row.assessment_id ?? null,
      closedAt: (row as { closed_at?: string | null }).closed_at ?? null,
      grades: {},
    };
  });

  if (columns.length === 0) return columns;

  const byId = new Map(columns.map((column) => [column.id, column]));
  for (const grade of gradesRes.data ?? []) {
    const column = byId.get(grade.assignment_id);
    if (!column) continue;
    const status = grade.status === "missing" ? "missing" : "graded";
    column.grades[grade.student_id] = {
      mark: grade.mark,
      maxMarks: grade.max_marks,
      status,
    };
  }

  return columns;
}
