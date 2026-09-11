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
  instructions: instructionsSchema,
  content: contentSchema,
});

/** Creates an empty draft and returns its id (the editor opens it). */
export async function createAssessment(input: {
  classId: string;
  kind: "homework" | "exam";
  topicId?: string | null;
}): Promise<AssessmentActionResult> {
  const t = await getT();
  const parsed = z
    .object({
      classId: z.string().uuid(),
      kind: z.enum(["homework", "exam"]),
      topicId: z.string().uuid().nullable().optional(),
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

/**
 * Keeps the linked grade column (`assignments`) in sync with the assessment so
 * the teacher authors once and the gradebook reflects it. The column is created
 * only once the assessment is published; an existing column is always updated.
 * Tolerates the link columns not being migrated yet (never blocks the save).
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
  },
): Promise<void> {
  try {
    const { data: existing } = await supabase
      .from("assignments")
      .select("id")
      .eq("assessment_id", input.assessmentId)
      .maybeSingle();

    if (existing?.id) {
      await supabase
        .from("assignments")
        .update({
          title: input.title,
          points: input.points,
          subject_id: input.subjectId,
          kind: input.kind,
          category: categoryFor(input.kind),
        })
        .eq("id", existing.id);
      return;
    }

    if (!input.published) return; // don't surface drafts in the gradebook

    const {
      data: { user },
    } = await supabase.auth.getUser();
    const tenantId = user?.app_metadata?.tenant_id ?? user?.user_metadata?.tenant_id;
    if (typeof tenantId !== "string") return;

    await supabase.from("assignments").insert({
      tenant_id: tenantId,
      class_id: input.classId,
      subject_id: input.subjectId,
      title: input.title,
      points: input.points,
      kind: input.kind,
      category: categoryFor(input.kind),
      assessment_id: input.assessmentId,
    });
  } catch {
    // Link columns not migrated yet — ignore; the assessment still saves.
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
  instructions: RichTextDoc | null;
  content: AssessmentContent;
}): Promise<AssessmentActionResult> {
  const t = await getT();
  const parsed = saveSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: t.assessments.errors.invalid };
  }
  const { id, classId, title, kind, subjectId, topicId, dueAt, instructions, content } =
    parsed.data;

  if (content.questions.length > 200) {
    return { ok: false, error: t.assessments.errors.tooManyQuestions };
  }

  const pointsTotal = computePointsTotal(content as AssessmentContent);
  const safeTitle = title || t.assessments.untitled;

  const supabase = await createSessionClient();
  const { error } = await supabase
    .from("assessments")
    .update({
      title: safeTitle,
      kind,
      subject_id: subjectId,
      topic_id: topicId,
      due_at: dueAt,
      instructions: (instructions ?? emptyDoc()) as RichTextDoc,
      content: content as AssessmentContent,
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

  await syncGradeColumn(supabase, {
    assessmentId: id,
    classId,
    subjectId,
    title: safeTitle,
    kind,
    points: pointsTotal,
    published: Boolean(row?.published),
  });

  revalidatePath(`/aula-virtual/${classId}`);
  revalidatePath(`/grupos/${classId}`);
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
  if (parsed.data.published) {
    const { data: row } = await supabase
      .from("assessments")
      .select("title, kind, subject_id, points_total")
      .eq("id", parsed.data.id)
      .maybeSingle();
    if (row) {
      await syncGradeColumn(supabase, {
        assessmentId: parsed.data.id,
        classId: parsed.data.classId,
        subjectId: (row.subject_id as string | null) ?? null,
        title: (row.title as string) ?? "",
        kind: row.kind === "exam" ? "exam" : "homework",
        points: Number(row.points_total) || 0,
        published: true,
      });
    }
  }

  revalidatePath(`/aula-virtual/${parsed.data.classId}`);
  revalidatePath(`/grupos/${parsed.data.classId}`);
  return { ok: true, id: parsed.data.id };
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
