import { describe, expect, it } from "vitest";
import type { AssessmentQuestion, RichTextDoc } from "@/lib/assessments/model";
import {
  blooketFileName,
  csvField,
  skipReasonLabel,
  toBlooketCsv,
  toBlooketRow,
  toBlooketSet,
} from "@/lib/assessments/blooket-csv";

/** Minimal ProseMirror doc holding one paragraph of text. */
function doc(text: string): RichTextDoc {
  return { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text }] }] };
}

function question(overrides: Partial<AssessmentQuestion>): AssessmentQuestion {
  return {
    id: "q1",
    type: "multiple_choice",
    prompt: doc("¿Capital de Costa Rica?"),
    points: 1,
    options: [
      { id: "a", text: "San José" },
      { id: "b", text: "Alajuela" },
    ],
    correctOptionIds: ["a"],
    answerKey: null,
    ...overrides,
  };
}

describe("toBlooketRow", () => {
  it("maps a single-choice question to 1-based answer numbers", () => {
    const result = toBlooketRow(question({}));
    expect(result).toEqual({
      row: {
        prompt: "¿Capital de Costa Rica?",
        answers: ["San José", "Alajuela"],
        correct: [1],
        seconds: 20,
      },
    });
  });

  it("puts multiple correct answers in ascending order", () => {
    const result = toBlooketRow(
      question({
        type: "multiple_answer",
        options: [
          { id: "a", text: "1" },
          { id: "b", text: "2" },
          { id: "c", text: "3" },
        ],
        correctOptionIds: ["c", "a"],
      }),
    );
    expect("row" in result && result.row.correct).toEqual([1, 3]);
  });

  it("supplies Verdadero/Falso labels for true_false questions", () => {
    const result = toBlooketRow(
      question({
        type: "true_false",
        prompt: doc("El sol es una estrella."),
        options: [
          { id: "true", text: "" },
          { id: "false", text: "" },
        ],
        correctOptionIds: ["true"],
      }),
    );
    expect(result).toEqual({
      row: {
        prompt: "El sol es una estrella.",
        answers: ["Verdadero", "Falso"],
        correct: [1],
        seconds: 20,
      },
    });
  });

  it("exports short_answer and number as typed answers when a key exists", () => {
    const short = toBlooketRow(
      question({ type: "short_answer", options: [], correctOptionIds: [], answerKey: "San José" }),
    );
    const numeric = toBlooketRow(
      question({ type: "number", prompt: doc("3 + 3"), options: [], correctOptionIds: [], answerKey: "6" }),
    );
    expect("row" in short && short.row.answers).toEqual(["San José"]);
    expect("row" in numeric && numeric.row.answers).toEqual(["6"]);
  });

  it("skips typed answers that have no answer key", () => {
    const result = toBlooketRow(
      question({ type: "short_answer", options: [], correctOptionIds: [], answerKey: null }),
    );
    expect(result).toEqual({ skip: "unsupported_type" });
  });

  it("skips questions with more than four options", () => {
    const result = toBlooketRow(
      question({
        options: ["a", "b", "c", "d", "e"].map((id) => ({ id, text: id })),
        correctOptionIds: ["a"],
      }),
    );
    expect(result).toEqual({ skip: "too_many_options" });
  });

  it("skips matching and paragraph questions", () => {
    const matching = toBlooketRow(
      question({ type: "matching", premises: ["A", "B"], options: [{ id: "x", text: "1" }] }),
    );
    const paragraph = toBlooketRow(question({ type: "paragraph", options: [], correctOptionIds: [] }));
    expect(matching).toEqual({ skip: "unsupported_type" });
    expect(paragraph).toEqual({ skip: "unsupported_type" });
  });

  it("skips questions with no prompt, no key, or blank options", () => {
    expect(toBlooketRow(question({ prompt: { type: "doc", content: [] } }))).toEqual({
      skip: "empty_prompt",
    });
    expect(toBlooketRow(question({ correctOptionIds: [] }))).toEqual({ skip: "no_correct_answer" });
    expect(
      toBlooketRow(
        question({
          options: [
            { id: "a", text: "ok" },
            { id: "b", text: "   " },
          ],
          correctOptionIds: ["a"],
        }),
      ),
    ).toEqual({ skip: "no_options" });
  });
});

describe("toBlooketSet", () => {
  it("keeps the exportable rows and reports the rest with their position", () => {
    const set = toBlooketSet({
      title: "Ciencias 8°",
      questions: [
        question({ id: "q1" }),
        question({ id: "q2", type: "matching", premises: ["A", "B"] }),
        question({ id: "q3" }),
      ],
    });
    expect(set.rows).toHaveLength(2);
    expect(set.skipped).toEqual([
      { index: 1, prompt: "¿Capital de Costa Rica?", reason: "unsupported_type" },
    ]);
  });

  it("falls back to a default title", () => {
    expect(toBlooketSet({ title: "   ", questions: [] }).title).toBe("Weeon");
  });
});

describe("toBlooketCsv", () => {
  it("writes the template's empty first row, its header, then one row per question", () => {
    const csv = toBlooketCsv(toBlooketSet({ title: "T", questions: [question({})] }));
    const lines = csv.trimEnd().split("\r\n");
    expect(lines[0]).toBe(",,,,,,,,,,,");
    // Blooket's header keeps its line breaks and hints; quoted, as in its file.
    expect(lines[1]).toContain('"Answer 3 \n(Optional)"');
    expect(lines[1]).toContain('"Correct Answer(s) \n(Only Include Answer #)"');
    expect(lines[2]).toBe('1,¿Capital de Costa Rica?,San José,Alajuela,,,20,1,,,,');
  });

  it("writes the title into the spare first cell", () => {
    const csv = toBlooketCsv(toBlooketSet({ title: "Ciencias", questions: [] }), {
      includeTitleRow: true,
    });
    expect(csv.split("\r\n")[0]).toBe("Ciencias,,,,,,,,,,,");
  });

  it("escapes commas, quotes and newlines so columns stay aligned", () => {
    const csv = toBlooketCsv(
      toBlooketSet({
        title: "T",
        questions: [
          question({
            prompt: doc('Dijo "hola", y se fue\na otra parte'),
          }),
        ],
      }),
    );
    expect(csv).toContain('"Dijo ""hola"", y se fue');
  });
});

describe("csvField", () => {
  it("leaves plain values alone and quotes the rest", () => {
    expect(csvField("simple")).toBe("simple");
    expect(csvField("a,b")).toBe('"a,b"');
    expect(csvField('say "hi"')).toBe('"say ""hi"""');
    expect(csvField("line\nbreak")).toBe('"line\nbreak"');
  });
});

describe("blooketFileName", () => {
  it("slugifies the title and strips accents", () => {
    expect(blooketFileName("Ciencias 8° — Repaso")).toBe("ciencias-8-repaso-blooket.csv");
    expect(blooketFileName("")).toBe("blooket-blooket.csv");
  });
});

describe("skipReasonLabel", () => {
  it("explains each reason in Spanish", () => {
    expect(skipReasonLabel("too_many_options")).toContain("4");
    expect(skipReasonLabel("unsupported_type")).toMatch(/Pareo/);
  });
});
