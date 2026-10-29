import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { AssessmentQuestion, RichTextDoc } from "@/lib/assessments/model";
import { toBlooketCsv, toBlooketSet } from "@/lib/assessments/blooket-csv";

/** The file downloaded from Blooket's "CSV Upload" screen, kept verbatim. */
const TEMPLATE = readFileSync(
  fileURLToPath(new URL("./__fixtures__/blooket-template.csv", import.meta.url)),
  "utf8",
).replace(/^\uFEFF/, "");

/** Splits a CSV row honouring quotes and embedded newlines. */
function parseRow(line: string): string[] {
  const out: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (quoted) {
      if (char === '"' && line[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"') quoted = true;
    else if (char === ",") {
      out.push(field);
      field = "";
    } else field += char;
  }
  out.push(field);
  return out;
}

/** Records of a whole CSV, handling quoted multi-line cells. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (char === '"') quoted = !quoted;
    if (!quoted && (char === "\n" || char === "\r")) {
      if (char === "\r" && text[i + 1] === "\n") i += 1;
      rows.push(parseRow(row));
      row = "";
      continue;
    }
    row += char;
  }
  if (row) rows.push(parseRow(row));
  return rows;
}

const doc = (text: string): RichTextDoc => ({
  type: "doc",
  content: [{ type: "paragraph", content: [{ type: "text", text }] }],
});

function choice(prompt: string, options: string[], correct: number): AssessmentQuestion {
  return {
    id: prompt,
    type: "multiple_choice",
    prompt: doc(prompt),
    points: 1,
    options: options.map((text, index) => ({ id: `o${index}`, text })),
    correctOptionIds: [`o${correct}`],
    answerKey: null,
  };
}

describe("Blooket template parity", () => {
  const templateRows = parseCsv(TEMPLATE);

  it("uses the same header cells as the downloaded template", () => {
    const ourHeader = parseCsv(toBlooketCsv(toBlooketSet({ title: "T", questions: [] })))[1];
    expect(ourHeader).toEqual(templateRows[1]);
  });

  it("starts with the same empty first row and keeps the trailing columns empty", () => {
    const rows = parseCsv(toBlooketCsv(toBlooketSet({ title: "T", questions: [] })));
    expect(rows[0]).toEqual(templateRows[0]);
    expect(rows[0]).toHaveLength(templateRows[0].length);
    expect(rows[1]).toHaveLength(templateRows[1].length);
  });

  it("matches the template's own example rows", () => {
    // Row 1 in the template is a multi-answer question (answers 1 and 4),
    // row 2 is single-choice with only two answers.
    const set = toBlooketSet({
      title: "T",
      questions: [
        { ...choice("What's 2 + 2?", ["4", "3", "1", "Four"], 0), type: "multiple_answer", correctOptionIds: ["o0", "o3"] },
        choice("What's 3 + 3?", ["3", "6"], 1),
      ],
    });
    const rows = parseCsv(toBlooketCsv(set));
    // Columns 0..5 and 7 (question, answers, correct); the time limit differs
    // because the template happens to use 15s for its second example.
    const comparable = (row: string[]) => [0, 1, 2, 3, 4, 5, 7].map((i) => row[i]);
    expect(comparable(rows[2])).toEqual(comparable(templateRows[2]));
    expect(comparable(rows[3])).toEqual(comparable(templateRows[3]));
  });

  it("writes several correct answers the way the template does", () => {
    const set = toBlooketSet({
      title: "T",
      questions: [
        {
          ...choice("What's 2 + 2?", ["4", "3", "1", "Four"], 0),
          type: "multiple_answer",
          correctOptionIds: ["o0", "o3"],
        },
      ],
    });
    const rows = parseCsv(toBlooketCsv(set));
    expect(rows[2][7]).toBe("1,4");
  });

  it("puts the title in the spare first cell without breaking the header", () => {
    const rows = parseCsv(
      toBlooketCsv(toBlooketSet({ title: "Ciencias 8°", questions: [] }), {
        includeTitleRow: true,
      }),
    );
    expect(rows[0][0]).toBe("Ciencias 8°");
    expect(rows[1]).toEqual(templateRows[1]);
  });
});
