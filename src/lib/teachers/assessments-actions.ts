"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSessionClient } from "@/lib/supabase/session";
import { getT } from "@/lib/i18n/server";
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
  dueAt: z.string().nullable(),
  instructions: instructionsSchema,
  content: contentSchema,
});

/** Creates an empty draft and returns its id (the editor opens it). */
export async function createAssessment(input: {
  classId: string;
  kind: "homework" | "exam";
}): Promise<AssessmentActionResult> {
  const t = await getT();
  const parsed = z
    .object({
      classId: z.string().uuid(),
      kind: z.enum(["homework", "exam"]),
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

/** Saves the whole definition (title, kind, due date, instructions, questions). */
export async function saveAssessment(input: {
  id: string;
  classId: string;
  title: string;
  kind: "homework" | "exam";
  dueAt: string | null;
  instructions: RichTextDoc | null;
  content: AssessmentContent;
}): Promise<AssessmentActionResult> {
  const t = await getT();
  const parsed = saveSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: t.assessments.errors.invalid };
  }
  const { id, classId, title, kind, dueAt, instructions, content } = parsed.data;

  if (content.questions.length > 200) {
    return { ok: false, error: t.assessments.errors.tooManyQuestions };
  }

  const supabase = await createSessionClient();
  const { error } = await supabase
    .from("assessments")
    .update({
      title: title || t.assessments.untitled,
      kind,
      due_at: dueAt,
      instructions: (instructions ?? emptyDoc()) as RichTextDoc,
      content: content as AssessmentContent,
      points_total: computePointsTotal(content as AssessmentContent),
    })
    .eq("id", id)
    .eq("class_id", classId);

  if (error) {
    return { ok: false, error: t.assessments.errors.save };
  }

  revalidatePath(`/aula-virtual/${classId}`);
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

  revalidatePath(`/aula-virtual/${parsed.data.classId}`);
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
