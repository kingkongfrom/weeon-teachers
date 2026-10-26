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

/**
 * Pareo fixtures: four premises, four responses, key index-aligned.
 * Premises: 1→a, 2→b, 3→c, 4→d (each pair worth 1 pt on a 4-pt question).
 */
const matching = (over: Partial<AssessmentQuestion> = {}): AssessmentQuestion =>
  q({
    type: "matching",
    points: 4,
    premises: ["P1", "P2", "P3", "P4"],
    options: [
      { id: "a", text: "R1" },
      { id: "b", text: "R2" },
      { id: "c", text: "R3" },
      { id: "d", text: "R4" },
    ],
    correctOptionIds: ["a", "b", "c", "d"],
    ...over,
  });

describe("matching (Pareo)", () => {
  it("scores each correct pair 1 pt and gives partial credit", () => {
    const question = matching();
    expect(suggestScore(question, { optionIds: ["a", "b", "c", "d"], textValue: "" })).toBe(4);
    // 3 of 4 right → 3 pts
    expect(suggestScore(question, { optionIds: ["a", "b", "c", "z"], textValue: "" })).toBe(3);
    // 1 of 4 right → 1 pt
    expect(suggestScore(question, { optionIds: ["a", "x", "y", "z"], textValue: "" })).toBe(1);
    expect(suggestScore(question, { optionIds: [], textValue: "" })).toBe(0);
  });

  it("is positional: swapped answers are wrong even with the same set of ids", () => {
    const question = matching();
    // Same four responses, wrong order → 0 hits (a set compare would pass).
    expect(suggestScore(question, { optionIds: ["b", "a", "d", "c"], textValue: "" })).toBe(0);
  });

  it("does not let one response count twice", () => {
    const question = matching();
    // The same response reused on two premises only matches where it belongs.
    expect(suggestScore(question, { optionIds: ["a", "a", "a", "a"], textValue: "" })).toBe(1);
  });

  it("reports a fully matched question as correct", () => {
    const question = matching();
    expect(answerIsCorrect(question, { optionIds: ["a", "b", "c", "d"], textValue: "" })).toBe(true);
    expect(answerIsCorrect(question, { optionIds: ["a", "b", "c", "z"], textValue: "" })).toBe(false);
  });

  it("leaves an unanswered premise blank instead of matching a stale slot", () => {
    const question = matching();
    expect(suggestScore(question, { optionIds: ["", "b", "c", "d"], textValue: "" })).toBe(3);
  });

  it("cannot auto-score when the key is incomplete", () => {
    const question = matching({ correctOptionIds: ["a", "b", "", "d"] });
    expect(answerIsCorrect(question, { optionIds: ["a", "b", "c", "d"], textValue: "" })).toBeNull();
    expect(suggestScore(question, { optionIds: ["a", "b", "c", "d"], textValue: "" })).toBeNull();
  });

  it("scales with pair count when points track the count", () => {
    // 5 premises on a 5-pt question → each pair is worth exactly 1.
    const question = matching({
      points: 5,
      premises: ["P1", "P2", "P3", "P4", "P5"],
      correctOptionIds: ["a", "b", "c", "d", "e"],
      options: ["a", "b", "c", "d", "e"].map((id) => ({ id, text: id })),
    });
    expect(suggestScore(question, { optionIds: ["a", "b", "c", "e", "d"], textValue: "" })).toBe(3);
  });
});

describe("clampScore", () => {  it("clamps to 0..points and guards non-finite input", () => {
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
