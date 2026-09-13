import "server-only";

import { cache } from "react";
import { getTeacherSession } from "@/lib/auth/teacher-session";
import { createSessionClient } from "@/lib/supabase/session";
import type { TeacherStudent } from "@/lib/dashboard/grupos";

function rosterName(student: TeacherStudent): string {
  return `${student.lastName} ${student.firstName}`.trim() || "Estudiante";
}

export type SubmissionState = "draft" | "submitted" | "returned";

export type SubmissionSummary = {
  id: string;
  studentId: string;
  studentName: string;
  state: SubmissionState;
  grade: number | null;
  submittedAt: string | null;
};

export type AssessmentTurnIn = {
  assessmentId: string;
  submittedCount: number;
  gradedCount: number;
  submitterNames: string[];
  submissions: SubmissionSummary[];
};

type SubmissionRow = {
  id: string;
  assessment_id: string | null;
  student_id: string;
  state: string;
  grade: number | null;
  submitted_at: string | null;
};

function toState(value: string): SubmissionState {
  return value === "returned" || value === "draft" ? value : "submitted";
}

/** Submitted rows for a class's assessments. RLS limits the teacher to their grupo. */
export const loadClassTurnIns = cache(
  async (classId: string, students: TeacherStudent[]): Promise<Map<string, AssessmentTurnIn>> => {
    const session = await getTeacherSession();
    const empty = new Map<string, AssessmentTurnIn>();
    if (!session) return empty;

    const supabase = await createSessionClient();
    const { data: assessments, error: assessmentError } = await supabase
      .from("assessments")
      .select("id")
      .eq("class_id", classId);
    if (assessmentError || !assessments || assessments.length === 0) return empty;

    const ids = assessments.map((row) => row.id as string);
    const { data, error } = await supabase
      .from("submissions")
      .select("id, assessment_id, student_id, state, grade, submitted_at")
      .in("assessment_id", ids)
      .in("state", ["submitted", "returned"]);
    if (error || !data) return empty;

    const names = new Map(students.map((student) => [student.id, rosterName(student)]));
    const grouped = new Map<string, SubmissionSummary[]>();
    for (const row of data as SubmissionRow[]) {
      if (!row.assessment_id) continue;
      const list = grouped.get(row.assessment_id) ?? [];
      list.push({
        id: row.id,
        studentId: row.student_id,
        studentName: names.get(row.student_id) ?? "Estudiante",
        state: toState(row.state),
        grade: row.grade == null ? null : Number(row.grade),
        submittedAt: row.submitted_at,
      });
      grouped.set(row.assessment_id, list);
    }

    const stats = new Map<string, AssessmentTurnIn>();
    for (const [assessmentId, submissions] of grouped) {
      submissions.sort((a, b) => a.studentName.localeCompare(b.studentName, "es"));
      stats.set(assessmentId, {
        assessmentId,
        submittedCount: submissions.length,
        gradedCount: submissions.filter((submission) => submission.state === "returned").length,
        submitterNames: submissions.map((submission) => submission.studentName),
        submissions,
      });
    }
    return stats;
  },
);

export type SubmissionAnswer = {
  questionId: string;
  optionIds: string[];
  textValue: string;
  score: number | null;
  feedback: string | null;
};

export type AssessmentSubmissionDetail = {
  id: string;
  assessmentId: string;
  studentId: string;
  state: SubmissionState;
  grade: number | null;
  feedback: string | null;
  submittedAt: string | null;
  updatedAt: string;
  answers: SubmissionAnswer[];
};

type AnswerRow = {
  question_id: string;
  option_ids: unknown;
  text_value: string | null;
  score: number | null;
  feedback: string | null;
};

function toOptionIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((id): id is string => typeof id === "string");
}

/** One submitted assessment with the student's answers and any saved scores. */
export const loadAssessmentSubmission = cache(
  async (
    assessmentId: string,
    submissionId: string,
  ): Promise<AssessmentSubmissionDetail | null> => {
    const session = await getTeacherSession();
    if (!session) return null;

    const supabase = await createSessionClient();
    const { data, error } = await supabase
      .from("submissions")
      .select(
        "id, assessment_id, student_id, state, grade, feedback, submitted_at, updated_at, submission_answers(question_id, option_ids, text_value, score, feedback)",
      )
      .eq("id", submissionId)
      .eq("assessment_id", assessmentId)
      .maybeSingle();

    if (error || !data) return null;
    const row = data as {
      id: string;
      assessment_id: string;
      student_id: string;
      state: string;
      grade: number | null;
      feedback: string | null;
      submitted_at: string | null;
      updated_at: string;
      submission_answers: AnswerRow[] | null;
    };

    return {
      id: row.id,
      assessmentId: row.assessment_id,
      studentId: row.student_id,
      state: toState(row.state),
      grade: row.grade == null ? null : Number(row.grade),
      feedback: row.feedback,
      submittedAt: row.submitted_at,
      updatedAt: row.updated_at,
      answers: (row.submission_answers ?? []).map((answer) => ({
        questionId: answer.question_id,
        optionIds: toOptionIds(answer.option_ids),
        textValue: answer.text_value ?? "",
        score: answer.score == null ? null : Number(answer.score),
        feedback: answer.feedback,
      })),
    };
  },
);
