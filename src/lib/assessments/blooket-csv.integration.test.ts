import { describe, expect, it } from "vitest";
import type { AssessmentQuestion, RichTextDoc } from "@/lib/assessments/model";
import { toBlooketCsv, toBlooketSet } from "@/lib/assessments/blooket-csv";

const doc = (text: string): RichTextDoc => ({
  type: "doc",
  content: [{ type: "paragraph", content: [{ type: "text", text }] }],
});

/**
 * A realistic Spanish set mixing every question type, checked as one CSV so the
 * escaping rules are verified against text that actually appears in class.
 */
describe("full set export", () => {
  it("writes a valid Blooket CSV and reports the questions it cannot carry", () => {
    const questions: AssessmentQuestion[] = [
      {
        id: "q1",
        type: "multiple_choice",
        prompt: doc("¿Cuál es el planeta más grande del sistema solar?"),
        points: 1,
        options: [
          { id: "a", text: "Júpiter" },
          { id: "b", text: "Marte, el rojo" },
          { id: "c", text: 'La Tierra "azul"' },
        ],
        correctOptionIds: ["b"],
        answerKey: null,
      },
      {
        id: "q2",
        type: "true_false",
        prompt: doc("El Sol es una estrella."),
        points: 1,
        options: [
          { id: "true", text: "" },
          { id: "false", text: "" },
        ],
        correctOptionIds: ["true"],
        answerKey: null,
      },
      {
        id: "q3",
        type: "short_answer",
        prompt: doc("¿En qué año llegó el hombre a la Luna?"),
        points: 1,
        options: [],
        correctOptionIds: [],
        answerKey: "1969",
      },
      {
        id: "q4",
        type: "matching",
        prompt: doc("Pareo de planetas"),
        points: 2,
        options: [{ id: "x", text: "1" }],
        correctOptionIds: ["x"],
        answerKey: null,
        premises: ["Marte", "Venus"],
      },
      {
        id: "q5",
        type: "multiple_choice",
        prompt: doc("Cinco opciones"),
        points: 1,
        options: "abcde".split("").map((id) => ({ id, text: id })),
        correctOptionIds: ["a"],
        answerKey: null,
      },
    ];

    const set = toBlooketSet({ title: "Ciencias 8° — Sistema solar", questions });

    expect(set.rows).toHaveLength(3);
    expect(set.skipped.map((item) => item.reason)).toEqual([
      "unsupported_type",
      "too_many_options",
    ]);

    const csv = toBlooketCsv(set, { includeTitleRow: true });
    const lines = csv.trimEnd().split("\r\n");

    expect(lines[0]).toBe("Ciencias 8° — Sistema solar,,,,,,,,,,,");
    expect(lines[1]).toContain("Question #,Question Text");
    expect(lines[2]).toBe(
      '1,¿Cuál es el planeta más grande del sistema solar?,Júpiter,"Marte, el rojo","La Tierra ""azul""",,20,2,,,,',
    );
    expect(lines[3]).toBe("2,El Sol es una estrella.,Verdadero,Falso,,,20,1,,,,");
    expect(lines[4]).toBe("3,¿En qué año llegó el hombre a la Luna?,1969,,,,20,1,,,,");
  });
});
