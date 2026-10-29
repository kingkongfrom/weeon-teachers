import { docToPlainText, type AssessmentQuestion } from "@/lib/assessments/model";

/** Blooket CSV import format.
 *
 * Blooket accepts one row per question with at most four answers and a
 * "Correct Answer(s)" column holding 1-based answer numbers (`2`, or `1,3` for
 * several). Anything else — Pareo, free text, more than four options — has no
 * representation there, so it is reported instead of being silently dropped.
 * See https://help.blooket.com/hc/en-us/articles/16002377931543 */

/** Blooket rejects questions past the fourth answer. */
export const BLOOKET_MAX_ANSWERS = 4;

/** True/false is stored without option text; Blooket needs the labels. */
const TRUE_FALSE_OPTIONS = [
  { id: "true", text: "Verdadero" },
  { id: "false", text: "Falso" },
] as const;
const TRUE_FALSE_ANSWERS = TRUE_FALSE_OPTIONS.map((option) => option.text);

/** Default seconds per question; Blooket caps the limit at 300. */
export const BLOOKET_DEFAULT_SECONDS = 20;

/** A question from the builder (the same shape the exam editor edits). */
export type BlooketQuestion = AssessmentQuestion;

export type BlooketSkipReason =
  | "unsupported_type"
  | "too_many_options"
  | "empty_prompt"
  | "no_options"
  | "no_correct_answer";

/** One question that cannot be represented in a Blooket set. */
export type BlooketSkipped = {
  index: number;
  prompt: string;
  reason: BlooketSkipReason;
};

/** One Blooket row: answers are 1-4 wide, `correct` is 1-based answer numbers. */
export type BlooketRow = {
  prompt: string;
  answers: string[];
  correct: number[];
  seconds: number;
};

export type BlooketSet = {
  title: string;
  rows: BlooketRow[];
  skipped: BlooketSkipped[];
};

/**
 * Header cells copied verbatim from Blooket's own template
 * (`Blooket_Spreadsheet_Import_Template.csv`), including the line breaks and
 * the hints in parentheses. The importer matches on these, so they must not be
 * "cleaned up".
 */
const HEADER = [
  "Question #",
  "Question Text",
  "Answer 1",
  "Answer 2",
  "Answer 3 \n(Optional)",
  "Answer 4 \n(Optional)",
  "Time Limit (sec) \n(Max: 300 Seconds)",
  "Correct Answer(s) \n(Only Include Answer #)",
];

/** Quotes a field so commas, quotes and newlines survive the round trip. */
export function csvField(value: string): string {
  if (!/[",\r\n]/.test(value)) return value;
  return `"${value.replace(/"/g, '""')}"`;
}

/** True for the types Blooket can hold as a typed answer (short answer, number). */
function isTypedAnswer(question: BlooketQuestion): boolean {
  return (
    (question.type === "short_answer" || question.type === "number") &&
    Boolean(question.answerKey?.trim())
  );
}

/**
 * Converts one authored question into a Blooket row, or explains why it cannot
 * be converted. Kept separate from `toBlooketSet` so each rule is testable on
 * its own.
 */
export function toBlooketRow(
  question: BlooketQuestion,
  seconds = BLOOKET_DEFAULT_SECONDS,
): { row: BlooketRow } | { skip: BlooketSkipReason } {
  const prompt = docToPlainText(question.prompt);
  if (!prompt) return { skip: "empty_prompt" };

  if (isTypedAnswer(question)) {
    return {
      row: {
        prompt,
        answers: [question.answerKey!.trim()],
        correct: [1],
        seconds,
      },
    };
  }

  if (question.type === "multiple_choice" || question.type === "multiple_answer") {
    // Keep the option order but never lose the correct ones: if the choices
    // overflow Blooket's four columns, the question is skipped rather than
    // exported with its answer cut off.
    const options = question.options.map((option) => ({ ...option, text: option.text.trim() }));
    if (options.length === 0) return { skip: "no_options" };
    if (options.length > BLOOKET_MAX_ANSWERS) return { skip: "too_many_options" };

    const answers = options.map((option) => option.text);
    const correct = question.correctOptionIds
      .map((id) => options.findIndex((option) => option.id === id))
      .filter((index) => index >= 0)
      .map((index) => index + 1)
      .sort((a, b) => a - b);

    if (correct.length === 0) return { skip: "no_correct_answer" };
    if (answers.some((answer) => !answer)) return { skip: "no_options" };

    return { row: { prompt, answers, correct, seconds } };
  }

  if (question.type === "true_false") {
    // The model stores the pair as options with empty text; the UI renders the
    // labels, so the CSV has to supply them.
    const answers = TRUE_FALSE_ANSWERS.slice();
    const correct = question.correctOptionIds
      .map((id) => TRUE_FALSE_OPTIONS.findIndex((option) => option.id === id))
      .filter((index) => index >= 0)
      .map((index) => index + 1)
      .sort((a, b) => a - b);

    if (correct.length === 0) return { skip: "no_correct_answer" };
    return { row: { prompt, answers, correct, seconds } };
  }

  // Pareo has no Blooket equivalent, and paragraph/essay is not playable.
  return { skip: "unsupported_type" };
}

/**
 * Builds a Blooket set from authored questions, collecting the ones that do not
 * fit so the teacher can see what will not travel.
 */
export function toBlooketSet(
  input: { title: string; questions: BlooketQuestion[] },
  seconds = BLOOKET_DEFAULT_SECONDS,
): BlooketSet {
  const rows: BlooketRow[] = [];
  const skipped: BlooketSkipped[] = [];

  input.questions.forEach((question, index) => {
    const result = toBlooketRow(question, seconds);
    if ("row" in result) {
      rows.push(result.row);
      return;
    }
    skipped.push({
      index,
      prompt: docToPlainText(question.prompt),
      reason: result.skip,
    });
  });

  return { title: input.title.trim() || "Weeon", rows, skipped };
}

/**
 * Renders a Blooket set as CSV in the shape of Blooket's own template
 * (`Blooket_Spreadsheet_Import_Template.csv`):
 *
 * - a first row of empty cells, then the header;
 * - header cells keep Blooket's line breaks and hints, which is why they are
 *   quoted instead of being replaced by a simplified label;
 * - columns I..K exist but stay empty, as in the template.
 *
 * Blooket ignores the title in the file (it asks for it in the Create dialog),
 * so `includeTitleRow` writes it into the first cell of the spare row purely to
 * help the teacher tell downloads apart.
 */
export function toBlooketCsv(set: BlooketSet, options?: { includeTitleRow?: boolean }): string {
  const lines: string[] = [];

  // The template has 12 columns: the 8 above plus four empty ones.
  const EMPTY_TAIL = ["", "", "", ""];

  const firstRow = ["", "", "", "", "", "", "", "", "", "", "", ""];
  if (options?.includeTitleRow) firstRow[0] = set.title;
  lines.push(firstRow.map(csvField).join(","));

  lines.push([...HEADER, ...EMPTY_TAIL].map(csvField).join(","));

  set.rows.forEach((row, rowIndex) => {
    const answers = [0, 1, 2, 3].map((slot) => row.answers[slot] ?? "");
    lines.push(
      [
        String(rowIndex + 1),
        csvField(row.prompt),
        ...answers.map(csvField),
        String(row.seconds),
        csvField(row.correct.join(",")),
        ...EMPTY_TAIL,
      ].join(","),
    );
  });

  // CRLF keeps Excel from mangling the accents in Spanish questions.
  return `${lines.join("\r\n")}\r\n`;
}

/** Safe download name: `Weeon - Ciencias 8°` → `weenon-ciencias-8.csv`. */
export function blooketFileName(title: string): string {
  const slug = title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `${slug || "blooket"}-blooket.csv`;
}

/** Human-readable reason shown next to a skipped question. */
export function skipReasonLabel(reason: BlooketSkipReason): string {
  switch (reason) {
    case "unsupported_type":
      return "Tipo sin equivalente en Blooket (Pareo o párrafo)";
    case "too_many_options":
      return `Más de ${BLOOKET_MAX_ANSWERS} opciones`;
    case "empty_prompt":
      return "Sin enunciado";
    case "no_options":
      return "Sin opciones";
    case "no_correct_answer":
      return "Sin respuesta correcta marcada";
  }
}
