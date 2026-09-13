"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSessionClient } from "@/lib/supabase/session";
import { getT } from "@/lib/i18n/server";

export type GradeActionResult =
  | { ok: true; grade: number; maxMarks: number }
  | { ok: false; error: string };

const scoreSchema = z.object({
  questionId: z.string().min(1),
  score: z.number().min(0).max(1000).nullable(),
  feedback: z.string().max(2000).nullable().optional(),
});

const gradeSchema = z.object({
  classId: z.string().uuid(),
  assessmentId: z.string().uuid(),
  submissionId: z.string().uuid(),
  studentId: z.string().uuid(),
  scores: z.array(scoreSchema).max(500),
  feedback: z.string().max(4000).nullable(),
  returnWork: z.boolean(),
});

/**
 * Grades a student's submission: per-question scores + feedback go to
 * `submission_answers`, the total is written to `grades` (the linked grade
 * column), and the submission becomes `returned`. One write, no retyping in the
 * gradebook — see docs/aula-virtual.md § Grades & evaluation.
 */
export async function gradeAssessmentSubmission(input: {
  classId: string;
  assessmentId: string;
  submissionId: string;
  studentId: string;
  scores: Array<{ questionId: string; score: number | null; feedback?: string | null }>;
  feedback: string | null;
  returnWork: boolean;
}): Promise<GradeActionResult> {
  const t = await getT();
  const g = t.assessments.grading;
  const parsed = gradeSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: g.errors.generic };
  }
  const { classId, assessmentId, submissionId, studentId, scores, feedback, returnWork } =
    parsed.data;

  const supabase = await createSessionClient();
  const { data, error } = await supabase.rpc("grade_assessment_submission", {
    p_submission_id: submissionId,
    p_scores: scores.map((score) => ({
      question_id: score.questionId,
      score: score.score,
      feedback: score.feedback ?? null,
    })),
    p_feedback: feedback,
    p_return: returnWork,
  });

  if (error) {
    return { ok: false, error: mapGradeError(error.message, g.errors) };
  }

  const payload = (data ?? {}) as { grade?: number; max_marks?: number };
  const grade = Number(payload.grade ?? 0);
  const maxMarks = Number(payload.max_marks ?? 100);

  revalidatePath(`/aula-virtual/${classId}/evaluaciones/${assessmentId}`);
  revalidatePath(`/grupos/${classId}`);
  revalidatePath(`/estudiantes/${studentId}`);

  return { ok: true, grade, maxMarks };
}

function mapGradeError(
  raw: string,
  errors: { generic: string; notAllowed: string; migration: string },
): string {
  if (raw.includes("not_allowed")) return errors.notAllowed;
  if (raw.includes("tenant_read_only")) {
    return "La prueba de este colegio terminó. El acceso es de solo lectura.";
  }
  if (raw.includes("submission_not_found") || raw.includes("assessment_not_found")) {
    return errors.generic;
  }
  if (
    raw.includes("grade_assessment_submission") ||
    raw.includes("Could not find the function") ||
    raw.includes("PGRST202")
  ) {
    return errors.migration;
  }
  return errors.generic;
}
