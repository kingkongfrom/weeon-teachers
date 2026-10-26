/** Assessment definition model — shared by the teacher editor (client), the
 * student renderer, and the server loaders. Plain JSON, no server imports, so
 * both web and Flutter can render the same shape. Source of truth is this JSON;
 * a PDF is only ever an export. See docs/aula-virtual.md § Assessments. */

export type RichTextMark = { type: string; attrs?: Record<string, unknown> };

export type RichTextNode = {
  type: string;
  attrs?: Record<string, unknown>;
  content?: RichTextNode[];
  text?: string;
  marks?: RichTextMark[];
};

export type RichTextDoc = { type: "doc"; content?: RichTextNode[] };

export type QuestionType =
  | "multiple_choice"
  | "multiple_answer"
  | "true_false"
  | "short_answer"
  | "paragraph"
  | "number"
  | "matching";

export const QUESTION_TYPES: QuestionType[] = [
  "multiple_choice",
  "multiple_answer",
  "true_false",
  "short_answer",
  "paragraph",
  "number",
  "matching",
];

export type QuestionOption = { id: string; text: string };

export type AssessmentQuestion = {
  id: string;
  type: QuestionType;
  prompt: RichTextDoc;
  points: number;
  options: QuestionOption[];
  /** For choice/true_false: the option ids that are correct. */
  correctOptionIds: string[];
  /** For short_answer/number: the expected answer (auto-grade). */
  answerKey: string | null;
  /**
   * For matching (Pareo): the left-hand premises, in display order.
   * `correctOptionIds[i]` is the response id that premise `i` matches, so the
   * two arrays are index-aligned. Each pair is worth `points / premises.length`,
   * which is why a Pareo question's points equal its premise count (each pair
   * = 1 pt) — see `matchingPairPoints`.
   */
  premises?: string[];
};

export type AssessmentContent = { questions: AssessmentQuestion[] };


export type AssessmentKind = "homework" | "exam";

export type AssessmentSummary = {
  id: string;
  title: string;
  kind: AssessmentKind;
  subjectId: string | null;
  topicId: string | null;
  dueAt: string | null;
  pointsTotal: number;
  published: boolean;
  closedAt: string | null;
  /** Students may attach photos to this turn-in (teacher switch). */
  allowPhotoSubmission: boolean;
  questionCount: number;
  updatedAt: string;
  submittedCount: number;
  submitterNames: string[];
};

export type Assessment = AssessmentSummary & {
  classId: string;
  subjectId: string | null;
  instructions: RichTextDoc | null;
  content: AssessmentContent;
};

/** Editable shape held by the builder (no ids needed). */
export type AssessmentDraft = {
  title: string;
  kind: AssessmentKind;
  subjectId: string | null;
  topicId: string | null;
  dueAt: string | null;
  allowPhotoSubmission: boolean;
  instructions: RichTextDoc | null;
  content: AssessmentContent;
};

export function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function emptyDoc(): RichTextDoc {
  return { type: "doc", content: [{ type: "paragraph" }] };
}

export function newOption(text = ""): QuestionOption {
  return { id: newId(), text };
}

/** Choice types need at least two options; true/false uses fixed ones. */
export function defaultOptionsFor(type: QuestionType): QuestionOption[] {
  switch (type) {
    case "multiple_choice":
    case "multiple_answer":
      return [newOption(), newOption()];
    default:
      return [];
  }
}

export function newQuestion(type: QuestionType): AssessmentQuestion {
  return {
    id: newId(),
    type,
    prompt: emptyDoc(),
    points: 1,
    options: type === "matching" ? defaultMatchingOptions() : defaultOptionsFor(type),
    correctOptionIds: [],
    answerKey: null,
    ...(type === "matching" ? { premises: ["", ""] } : {}),
  };
}

export function isChoiceType(type: QuestionType): boolean {
  return type === "multiple_choice" || type === "multiple_answer" || type === "true_false";
}

/** Pareo: number of left premises (equals the question's points, 1 pt each). */
export function matchingPairCount(question: Pick<AssessmentQuestion, "premises">): number {
  return question.premises?.length ?? 0;
}

/** Points awarded per correctly matched pair (1 when points track the count). */
export function matchingPairPoints(
  question: Pick<AssessmentQuestion, "points" | "premises">,
): number {
  const pairs = matchingPairCount(question);
  if (pairs <= 0) return 0;
  return question.points / pairs;
}

/** A Pareo always starts with two premise/response pairs to fill in. */
export function defaultMatchingOptions(): QuestionOption[] {
  return [newOption(), newOption()];
}

export function computePointsTotal(content: AssessmentContent): number {
  return content.questions.reduce((sum, question) => sum + (Number(question.points) || 0), 0);
}

/** Best-effort plain-text extraction from a ProseMirror doc (previews, search). */
export function docToPlainText(doc: RichTextDoc | null | undefined): string {
  if (!doc?.content) return "";
  const parts: string[] = [];
  const walk = (nodes: RichTextNode[] | undefined) => {
    for (const node of nodes ?? []) {
      if (node.text) parts.push(node.text);
      if (node.content) walk(node.content);
      if (node.type === "paragraph" || node.type === "listItem") parts.push(" ");
    }
  };
  walk(doc.content);
  return parts.join("").replace(/\s+/g, " ").trim();
}

export function isObjective(type: QuestionType): boolean {
  return (
    type === "multiple_choice" ||
    type === "multiple_answer" ||
    type === "true_false" ||
    type === "short_answer" ||
    type === "number" ||
    type === "matching"
  );
}
