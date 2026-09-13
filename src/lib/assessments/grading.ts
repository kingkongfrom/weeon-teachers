/** Grading helpers shared by the teacher grader UI. Pure functions only — no
 * server imports — so the scoring suggestions are easy to reason about. */

import { isChoiceType, type AssessmentQuestion } from "@/lib/assessments/model";

export type AnswerLike = { optionIds: string[]; textValue: string };

/** Lowercase, trim, collapse spaces, and drop accents for tolerant compares. */
export function normalizeAnswer(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function sameSet(a: string[], b: string[]): boolean {
  const setA = new Set(a);
  const setB = new Set(b);
  if (setA.size !== setB.size) return false;
  for (const value of setA) {
    if (!setB.has(value)) return false;
  }
  return true;
}

function toNumber(value: string): number | null {
  const parsed = Number(normalizeAnswer(value).replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Whether an answer is correct. Returns `null` when the question cannot be
 * auto-scored (paragraph, or an objective question with no answer key).
 */
export function answerIsCorrect(
  question: AssessmentQuestion,
  answer: AnswerLike | undefined,
): boolean | null {
  if (isChoiceType(question.type)) {
    if (question.correctOptionIds.length === 0) return null;
    return sameSet(answer?.optionIds ?? [], question.correctOptionIds);
  }

  if (question.type === "number") {
    const key = question.answerKey?.trim() ?? "";
    if (!key) return null;
    const expected = toNumber(key);
    const got = toNumber(answer?.textValue ?? "");
    if (expected === null || got === null) return null;
    return expected === got;
  }

  if (question.type === "short_answer") {
    const key = normalizeAnswer(question.answerKey ?? "");
    if (!key) return null;
    return normalizeAnswer(answer?.textValue ?? "") === key;
  }

  return null;
}

/** Suggested points: full when correct, zero when wrong, `null` when manual. */
export function suggestScore(
  question: AssessmentQuestion,
  answer: AnswerLike | undefined,
): number | null {
  const correct = answerIsCorrect(question, answer);
  if (correct === null) return null;
  return correct ? question.points : 0;
}

export function clampScore(value: number, points: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(value, points));
}

/** Sum of the entered scores, ignoring unanswered fields. */
export function totalFromScores(
  scores: Record<string, number | null | undefined>,
): number {
  return Object.values(scores).reduce<number>(
    (sum, value) => sum + (typeof value === "number" ? value : 0),
    0,
  );
}

/** Whole-number percentage for the summary ring, clamped to 0–100. */
export function scorePercent(total: number, max: number): number {
  if (!Number.isFinite(max) || max <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((total / max) * 100)));
}
