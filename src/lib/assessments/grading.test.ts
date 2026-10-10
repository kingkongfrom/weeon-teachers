import { describe, it, expect } from "vitest";
import {
  answerIsCorrect,
  clampScore,
  normalizeAnswer,
  scorePercent,
  suggestScore,
  totalFromScores,
} from "@/lib/assessments/grading";
import type { AssessmentQuestion } from "@/lib/assessments/model";

const q = (over: Partial<AssessmentQuestion>): AssessmentQuestion => ({
  id: "q1",
  type: "multiple_choice",
  prompt: { type: "doc" },
  points: 2,
  options: [],
  correctOptionIds: [],
  answerKey: null,
  ...over,
});

describe("normalizeAnswer", () => {
  it("lowercases, trims, collapses spaces and strips accents", () => {
    expect(normalizeAnswer("  Río   Verde ")).toBe("rio verde");
    expect(normalizeAnswer("ÁÉÍÓÚ")).toBe("aeiou");
  });
});

describe("answerIsCorrect", () => {
  it("compares choice answers as sets", () => {
    const question = q({ type: "multiple_answer", correctOptionIds: ["a", "b"] });
    expect(answerIsCorrect(question, { optionIds: ["b", "a"], textValue: "" })).toBe(true);
    expect(answerIsCorrect(question, { optionIds: ["a"], textValue: "" })).toBe(false);
  });

  it("returns null for a choice question with no answer key", () => {
    expect(answerIsCorrect(q({ correctOptionIds: [] }), { optionIds: ["a"], textValue: "" })).toBeNull();
  });

  it("compares numbers with comma or dot decimal separators", () => {
    const question = q({ type: "number", answerKey: "3,5" });
    expect(answerIsCorrect(question, { optionIds: [], textValue: "3.5" })).toBe(true);
    expect(answerIsCorrect(question, { optionIds: [], textValue: "4" })).toBe(false);
  });

  it("compares short answers tolerantly", () => {
    const question = q({ type: "short_answer", answerKey: "Río Verde" });
    expect(answerIsCorrect(question, { optionIds: [], textValue: "rio   verde" })).toBe(true);
  });

  it("cannot auto-score paragraph questions", () => {
    expect(answerIsCorrect(q({ type: "paragraph" }), { optionIds: [], textValue: "x" })).toBeNull();
  });
});

describe("suggestScore", () => {
  it("returns full points when correct, zero when wrong, null when manual", () => {
    const choice = q({ type: "true_false", points: 3, correctOptionIds: ["t"] });
    expect(suggestScore(choice, { optionIds: ["t"], textValue: "" })).toBe(3);
    expect(suggestScore(choice, { optionIds: ["f"], textValue: "" })).toBe(0);
    expect(suggestScore(q({ type: "paragraph", points: 3 }), undefined)).toBeNull();
  });
});

describe("clampScore", () => {
  it("clamps to 0..points and guards non-finite input", () => {
    expect(clampScore(-5, 10)).toBe(0);
    expect(clampScore(12, 10)).toBe(10);
    expect(clampScore(7, 10)).toBe(7);
    expect(clampScore(Number.NaN, 10)).toBe(0);
  });
});

describe("totalFromScores", () => {
  it("sums numeric scores and ignores unanswered fields", () => {
    expect(totalFromScores({ a: 2, b: null, c: undefined, d: 3 })).toBe(5);
    expect(totalFromScores({})).toBe(0);
  });
});

describe("scorePercent", () => {
  it("returns a whole 0–100 percentage and guards zero max", () => {
    expect(scorePercent(7, 10)).toBe(70);
    expect(scorePercent(1, 3)).toBe(33);
    expect(scorePercent(5, 0)).toBe(0);
    expect(scorePercent(15, 10)).toBe(100);
  });
});
