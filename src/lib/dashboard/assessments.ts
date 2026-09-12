import "server-only";

import { cache } from "react";
import { getTeacherSession } from "@/lib/auth/teacher-session";
import { createSessionClient } from "@/lib/supabase/session";
import {
  computePointsTotal,
  emptyDoc,
  type Assessment,
  type AssessmentContent,
  type AssessmentKind,
  type AssessmentSummary,
  type RichTextDoc,
} from "@/lib/assessments/model";

type Row = {
  id: string;
  class_id: string;
  subject_id: string | null;
  topic_id: string | null;
  title: string;
  kind: string;
  instructions: RichTextDoc | null;
  content: AssessmentContent | null;
  due_at: string | null;
  points_total: number | null;
  published: boolean;
  updated_at: string;
};

function normalizeContent(content: AssessmentContent | null): AssessmentContent {
  if (!content || !Array.isArray(content.questions)) return { questions: [] };
  return { questions: content.questions };
}

function toSummary(row: Row): AssessmentSummary {
  const content = normalizeContent(row.content);
  return {
    id: row.id,
    title: row.title,
    kind: (row.kind === "exam" ? "exam" : "homework") as AssessmentKind,
    subjectId: row.subject_id,
    topicId: row.topic_id,
    dueAt: row.due_at,
    pointsTotal: row.points_total ?? computePointsTotal(content),
    published: row.published,
    questionCount: content.questions.length,
    updatedAt: row.updated_at,
  };
}

/** Homeworks/exams for a class. RLS scopes rows to classes the teacher sees. */
export const loadClassAssessments = cache(
  async (classId: string): Promise<AssessmentSummary[]> => {
    const session = await getTeacherSession();
    if (!session) return [];

    const supabase = await createSessionClient();
    const { data, error } = await supabase
      .from("assessments")
      .select(
        "id, class_id, subject_id, topic_id, title, kind, instructions, content, due_at, points_total, published, updated_at",
      )
      .eq("class_id", classId)
      .order("position", { ascending: true })
      .order("created_at", { ascending: false });

    if (error || !data) return [];
    return (data as Row[]).map(toSummary);
  },
);

export const loadAssessment = cache(async (id: string): Promise<Assessment | null> => {
  const session = await getTeacherSession();
  if (!session) return null;

  const supabase = await createSessionClient();
  const { data, error } = await supabase
    .from("assessments")
    .select(
      "id, class_id, subject_id, topic_id, title, kind, instructions, content, due_at, points_total, published, updated_at",
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  const row = data as Row;
  const content = normalizeContent(row.content);
  return {
    ...toSummary(row),
    classId: row.class_id,
    subjectId: row.subject_id,
    instructions: row.instructions ?? emptyDoc(),
    content,
  };
});

