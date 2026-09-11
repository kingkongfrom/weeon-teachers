"use client";

import { RichTextView } from "@/components/assessments/rich-text";
import { useT } from "@/lib/i18n/client";
import { isChoiceType, type AssessmentQuestion } from "@/lib/assessments/model";
import type { AssessmentDraft } from "@/lib/assessments/model";

/** Read-only student view of an assessment. This is intentionally the same
 * rendering the mobile app mirrors, and what the teacher sees in Preview. */
export function AssessmentPreview({ draft }: { draft: AssessmentDraft }) {
  const t = useT();
  const a = t.assessments;

  return (
    <div className="flex flex-col gap-6 rounded-2xl border border-border bg-surface p-6">
      <header className="flex flex-col gap-2 border-b border-border pb-4">
        <span className="inline-flex w-fit rounded-full bg-brand-50 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-brand-700 dark:bg-brand-950/40 dark:text-brand-300">
          {draft.kind === "exam" ? a.exam : a.homework}
        </span>
        <h1 className="text-xl font-bold text-foreground">
          {draft.title || a.untitled}
        </h1>
        <p className="text-xs font-medium text-foreground/50">
          {t.assessments.pointsTotal(
            Math.round(
              draft.content.questions.reduce(
                (sum, question) => sum + (Number(question.points) || 0),
                0,
              ),
            ),
          )}
          {draft.dueAt
            ? ` · ${a.dueDate}: ${new Date(draft.dueAt).toLocaleDateString("es-CR")}`
            : ""}
        </p>
      </header>

      {draft.instructions ? (
        <RichTextView doc={draft.instructions} className="text-sm" />
      ) : null}

      <ol className="flex flex-col gap-5">
        {draft.content.questions.map((question, index) => (
          <li key={question.id} className="flex flex-col gap-3">
            <div className="flex items-start gap-2">
              <span className="mt-0.5 text-sm font-bold text-foreground/40">
                {index + 1}.
              </span>
              <div className="min-w-0 flex-1">
                <RichTextView doc={question.prompt} className="text-sm" />
              </div>
              <span className="shrink-0 rounded-full bg-surface-muted px-2 py-0.5 text-[11px] font-semibold text-foreground/50">
                {question.points} {a.points}
              </span>
            </div>

            <div className="pl-5">
              <QuestionAnswerPreview question={question} />
            </div>
          </li>
        ))}
      </ol>

      {draft.content.questions.length === 0 ? (
        <p className="text-sm font-medium text-foreground/40">
          {a.empty}
        </p>
      ) : null}
    </div>
  );
}

function QuestionAnswerPreview({ question }: { question: AssessmentQuestion }) {
  const t = useT();
  const a = t.assessments;

  if (isChoiceType(question.type)) {
    const multiple = question.type === "multiple_answer";
    return (
      <ul className="flex flex-col gap-2">
        {question.options.map((option) => (
          <li
            key={option.id}
            className="flex items-center gap-2 text-sm text-foreground/70"
          >
            <span
              className={`h-4 w-4 shrink-0 border border-border ${
                multiple ? "rounded" : "rounded-full"
              }`}
            />
            <span>
              {question.type === "true_false"
                ? option.id === "true"
                  ? a.true
                  : a.false
                : option.text || a.optionPlaceholder}
            </span>
          </li>
        ))}
      </ul>
    );
  }

  if (question.type === "paragraph") {
    return (
      <div className="h-20 rounded-lg border border-dashed border-border" />
    );
  }

  return (
    <div className="h-9 max-w-xs rounded-lg border border-dashed border-border" />
  );
}
