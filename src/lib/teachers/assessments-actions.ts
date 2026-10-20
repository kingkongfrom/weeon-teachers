"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSessionClient } from "@/lib/supabase/session";
import { getT } from "@/lib/i18n/server";
import { categoryFor } from "@/lib/dashboard/exams";
import {
  computePointsTotal,
  emptyDoc,
  type AssessmentContent,
  type RichTextDoc,
} from "@/lib/assessments/model";
import { stripImageUrls } from "@/lib/assessments/rich-text-images";

/**
 * True when at least one student has turned the assessment in (`submitted` or
 * already `returned`). From that moment the questions and their points are
 * frozen: a student answered against the old rules, so re-scoring must not
 * silently change their points. Drafts of the same student do not lock it.
 */
async function hasSubmittedWork(
  supabase: Awaited<ReturnType<typeof createSessionClient>>,
  assessmentId: string,
): Promise<boolean> {
  const { count } = await supabase
    .from("submissions")
    .select("id", { count: "exact", head: true })
    .eq("assessment_id", assessmentId)
    .in("state", ["submitted", "returned"]);
  return (count ?? 0) > 0;
}
export type AssessmentActionResult =
  | { ok: true; id?: string }
  | { ok: false; error: string };

const questionSchema = z.object({
  id: z.string().min(1),
  type: z.enum([
    "multiple_choice",
    "multiple_answer",
    "true_false",
    "short_answer",
    "paragraph",
    "number",
  ]),
  prompt: z.record(z.string(), z.unknown()),
  points: z.number().min(0).max(1000),
  options: z.array(
    z.object({ id: z.string().min(1), text: z.string().max(1000) }),
  ),
  correctOptionIds: z.array(z.string()),
  answerKey: z.string().max(2000).nullable(),
});

const contentSchema = z.object({ questions: z.array(questionSchema) });

const instructionsSchema = z.record(z.string(), z.unknown()).nullable();

const saveSchema = z.object({
  id: z.string().uuid(),
  classId: z.string().uuid(),
  title: z.string().trim().max(200),
  kind: z.enum(["homework", "exam"]),
  subjectId: z.string().uuid().nullable(),
  topicId: z.string().uuid().nullable(),
  dueAt: z.string().nullable(),
  allowPhotoSubmission: z.boolean().optional(),
  instructions: instructionsSchema,
  content: contentSchema,
});

/** Creates an empty draft and returns its id (the editor opens it). */
export async function createAssessment(input: {
  classId: string;
  kind: "homework" | "exam";
  topicId?: string | null;
  subjectId?: string | null;
}): Promise<AssessmentActionResult> {
  const t = await getT();
  const parsed = z
    .object({
      classId: z.string().uuid(),
      kind: z.enum(["homework", "exam"]),
      topicId: z.string().uuid().nullable().optional(),
      subjectId: z.string().uuid().nullable().optional(),
    })
    .safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: t.assessments.errors.generic };
  }

  const supabase = await createSessionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const tenantId = user?.app_metadata?.tenant_id ?? user?.user_metadata?.tenant_id;
  if (typeof tenantId !== "string") {
    return { ok: false, error: t.assessments.errors.generic };
  }

  const { data, error } = await supabase
    .from("assessments")
    .insert({
      tenant_id: tenantId,
      class_id: parsed.data.classId,
      kind: parsed.data.kind,
      topic_id: parsed.data.topicId ?? null,
      subject_id: parsed.data.subjectId ?? null,
      title: t.assessments.untitled,
      instructions: null,
      content: { questions: [] },
      published: false,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { ok: false, error: t.assessments.errors.generic };
  }

  revalidatePath(`/aula-virtual/${parsed.data.classId}`);
  return { ok: true, id: data.id };
}

type SessionClient = Awaited<ReturnType<typeof createSessionClient>>;

/** Tenant from the signed-in JWT (app_metadata first, then user_metadata). */
async function currentTenantId(supabase: SessionClient): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const tenantId = user?.app_metadata?.tenant_id ?? user?.user_metadata?.tenant_id;
  return typeof tenantId === "string" ? tenantId : null;
}

/**
 * True when the account can write to the group (admin, homeroom teacher, or
 * teacher of one of its lessons). Publishing creates the grade column, so a
 * teacher who cannot write the group must hear it instead of seeing a draft
 * that silently never publishes.
 */
async function canWriteClass(
  supabase: SessionClient,
  classId: string,
): Promise<boolean> {
  const { data, error } = await supabase.rpc("teaches_class", { p_class_id: classId });
  if (error) return false;
  return data === true;
}

/**
 * Keeps the linked grade column (`assignments`) in sync with the assessment so
 * the teacher authors once and the gradebook reflects it. The column is created
 * only once the assessment is published; an existing column is always updated.
 * Tolerates the link columns not being migrated yet (never blocks the save).
 * Returns true when a published assessment ended up WITHOUT its grade column —
 * the caller surfaces that instead of reporting a successful publish.
 */
async function syncGradeColumn(
  supabase: SessionClient,
  input: {
    assessmentId: string;
    classId: string;
    subjectId: string | null;
    title: string;
    kind: "homework" | "exam";
    points: number;
    published: boolean;
    /** JWT tenant: `assignments.tenant_id` has no default and RLS checks it. */
    tenantId: string | null;
  },
): Promise<boolean> {
  try {
    // Every grade column belongs to a subject: fall back to the class's lesson
    // subject so a published assessment never creates a subject-less (orphan)
    // column. If the class has no subject at all, skip column creation.
    let subjectId = input.subjectId;
    if (subjectId == null) {
      const { data: lesson } = await supabase
        .from("class_lessons")
        .select("subject_id")
        .eq("class_id", input.classId)
        .not("subject_id", "is", null)
        .limit(1)
        .maybeSingle();
      subjectId = (lesson?.subject_id as string | null) ?? null;
    }

    const { data: existing } = await supabase
      .from("assignments")
      .select("id")
      .eq("assessment_id", input.assessmentId)
      .maybeSingle();

    if (existing?.id) {
      // Never rewrite the points of a column that already has grades: the
      // saved assessment content may predate the lock, but the gradebook
      // denominator is frozen once students are scored.
      const { count } = await supabase
        .from("grades")
        .select("id", { count: "exact", head: true })
        .eq("assignment_id", existing.id);

      await supabase
        .from("assignments")
        .update({
          title: input.title,
          ...((count ?? 0) === 0 ? { points: input.points } : {}),
          subject_id: subjectId,
          kind: input.kind,
          category: categoryFor(input.kind),
        })
        .eq("id", existing.id);
      return false;
    }

    if (!input.published) return false; // don't surface drafts in the gradebook
    if (subjectId == null) return true; // no subject yet — don't create an orphan column
    const tenantId = input.tenantId;
    if (tenantId == null) return true;

    // Published columns must land in a rubro, or the weighted final would
    // silently ignore them. Prefer the first active rubro; fall back to the
    // same "General 100%" rubro the migration backfill uses.
    let rubroId: string | null = null;
    try {
      const { data: rubro } = await supabase
        .from("grade_rubros")
        .select("id")
        .eq("class_id", input.classId)
        .eq("subject_id", subjectId)
        .eq("archived", false)
        .order("position")
        .limit(1)
        .maybeSingle();
      rubroId = rubro?.id ?? null;

      if (!rubroId) {
        const { data: created } = await supabase
          .from("grade_rubros")
          .insert({
            tenant_id: tenantId,
            class_id: input.classId,
            subject_id: subjectId,
            name: "General",
            peso: 100,
            position: 0,
          })
          .select("id")
          .single();
        rubroId = created?.id ?? null;
      }
    } catch {
      rubroId = null;
    }

    const { error: insertError } = await supabase.from("assignments").insert({
      tenant_id: tenantId,
      class_id: input.classId,
      subject_id: subjectId,
      title: input.title,
      points: input.points,
      kind: input.kind,
      category: categoryFor(input.kind),
      assessment_id: input.assessmentId,
      rubro_id: rubroId,
    });
    return insertError != null;
  } catch {
    // Link columns not migrated yet — ignore; the assessment still saves.
    return false;
  }
}

/** Saves the whole definition (title, kind, subject, due date, instructions, questions). */
export async function saveAssessment(input: {
  id: string;
  classId: string;
  title: string;
  kind: "homework" | "exam";
  subjectId: string | null;
  topicId: string | null;
  dueAt: string | null;
  allowPhotoSubmission?: boolean;
  instructions: RichTextDoc | null;
  content: AssessmentContent;
}): Promise<AssessmentActionResult> {
  const t = await getT();
  const parsed = saveSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: t.assessments.errors.invalid };
  }
  const {
    id,
    classId,
    title,
    kind,
    subjectId,
    topicId,
    dueAt,
    allowPhotoSubmission,
    instructions,
    content,
  } = parsed.data;

  if (content.questions.length > 200) {
    return { ok: false, error: t.assessments.errors.tooManyQuestions };
  }

  const supabase = await createSessionClient();

  // Locked once a student has turned it in: changing the questions or their
  // points after a submission would score that answer against different rules.
  // Deleting all turn-ins is the only way back, so the lock is fully reversible
  // and never strands a teacher.
  if (await hasSubmittedWork(supabase, id)) {
    return { ok: false, error: t.assessments.errors.lockedSubmitted };
  }

  // Strip the transient signed `src` from inline images; only the durable
  // `path` is persisted (URLs are re-signed on every load).
  const safeInstructions = stripImageUrls(instructions as RichTextDoc | null) ?? emptyDoc();
  const safeContent: AssessmentContent = {
    questions: content.questions.map((question) => ({
      ...question,
      prompt: stripImageUrls(question.prompt as RichTextDoc) ?? emptyDoc(),
    })),
  };

  const pointsTotal = computePointsTotal(safeContent);
  const safeTitle = title || t.assessments.untitled;

  const { error } = await supabase
    .from("assessments")
    .update({
      title: safeTitle,
      kind,
      subject_id: subjectId,
      topic_id: topicId,
      due_at: dueAt,
      allow_photo_submission: allowPhotoSubmission === true,
      instructions: safeInstructions,
      content: safeContent,
      points_total: pointsTotal,
    })
    .eq("id", id)
    .eq("class_id", classId);

  if (error) {
    return { ok: false, error: t.assessments.errors.save };
  }

  const { data: row } = await supabase
    .from("assessments")
    .select("published")
    .eq("id", id)
    .maybeSingle();

  const columnMissing = await syncGradeColumn(supabase, {
    assessmentId: id,
    classId,
    subjectId,
    title: safeTitle,
    kind,
    points: pointsTotal,
    published: Boolean(row?.published),
    tenantId: await currentTenantId(supabase),
  });

  revalidatePath(`/aula-virtual/${classId}`);
  revalidatePath(`/grupos/${classId}`);
  if (columnMissing) {
    return { ok: false, error: t.assessments.errors.gradeColumn };
  }
  return { ok: true, id };
}

export async function setAssessmentPublished(input: {
  id: string;
  classId: string;
  published: boolean;
}): Promise<AssessmentActionResult> {
  const t = await getT();
  const parsed = z
    .object({
      id: z.string().uuid(),
      classId: z.string().uuid(),
      published: z.boolean(),
    })
    .safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: t.assessments.errors.generic };
  }

  const supabase = await createSessionClient();

  // Publishing creates the grade column, which only a teacher of the group can
  // write. Refuse up front with a clear message instead of flipping the flag
  // and leaving a "published" draft with no column in the gradebook.
  if (parsed.data.published && !(await canWriteClass(supabase, parsed.data.classId))) {
    return { ok: false, error: t.assessments.errors.noClassAccess };
  }

  const { error } = await supabase
    .from("assessments")
    .update({ published: parsed.data.published })
    .eq("id", parsed.data.id)
    .eq("class_id", parsed.data.classId);

  if (error) {
    return { ok: false, error: t.assessments.errors.save };
  }

  // Publishing surfaces the assessment as a grade column; unpublishing leaves
  // the column (and any entered grades) in place so data is never lost.
  let columnMissing = false;
  if (parsed.data.published) {
    const { data: row } = await supabase
      .from("assessments")
      .select("title, kind, subject_id, points_total")
      .eq("id", parsed.data.id)
      .maybeSingle();
    if (row) {
      columnMissing = await syncGradeColumn(supabase, {
        assessmentId: parsed.data.id,
        classId: parsed.data.classId,
        subjectId: (row.subject_id as string | null) ?? null,
        title: (row.title as string) ?? "",
        kind: row.kind === "exam" ? "exam" : "homework",
        points: Number(row.points_total) || 0,
        published: true,
        tenantId: await currentTenantId(supabase),
      });
    }
  }

  revalidatePath(`/aula-virtual/${parsed.data.classId}`);
  revalidatePath(`/grupos/${parsed.data.classId}`);
  if (columnMissing) {
    return { ok: false, error: t.assessments.errors.gradeColumn };
  }
  return { ok: true, id: parsed.data.id };
}

/** Closes an assessment: students without a grade receive 0 in the gradebook. */
export async function closeAssessment(input: {
  classId: string;
  assessmentId: string;
}): Promise<AssessmentActionResult & { zerosInserted?: number }> {
  const t = await getT();
  const parsed = z
    .object({ classId: z.string().uuid(), assessmentId: z.string().uuid() })
    .safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: t.assessments.errors.generic };
  }

  const supabase = await createSessionClient();
  const { data, error } = await supabase.rpc("close_assessment", {
    p_assessment_id: parsed.data.assessmentId,
  });

  if (error) {
    if (error.message.includes("not_allowed")) {
      return { ok: false, error: t.assessments.grading.errors.notAllowed };
    }
    return { ok: false, error: t.assessments.errors.generic };
  }

  const payload = (data ?? {}) as { zeros_inserted?: number };
  revalidatePath(`/aula-virtual/${parsed.data.classId}/evaluaciones/${parsed.data.assessmentId}`);
  revalidatePath(`/grupos/${parsed.data.classId}`);
  return { ok: true, zerosInserted: Number(payload.zeros_inserted ?? 0) };
}

export async function deleteAssessment(input: {
  id: string;
  classId: string;
}): Promise<AssessmentActionResult> {
  const t = await getT();
  const parsed = z
    .object({ id: z.string().uuid(), classId: z.string().uuid() })
    .safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: t.assessments.errors.generic };
  }

  const supabase = await createSessionClient();
  const { error } = await supabase
    .from("assessments")
    .delete()
    .eq("id", parsed.data.id)
    .eq("class_id", parsed.data.classId);

  if (error) {
    return { ok: false, error: t.assessments.errors.delete };
  }

  revalidatePath(`/aula-virtual/${parsed.data.classId}`);
  return { ok: true };
}
