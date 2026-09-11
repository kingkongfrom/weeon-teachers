"use client";

import { ArrowDown, ArrowUp, Check, Copy, Plus, Trash2, X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/client";
import { RichTextEditor } from "@/components/assessments/rich-text";
import {
  defaultOptionsFor,
  isChoiceType,
  type AssessmentQuestion,
  type QuestionType,
} from "@/lib/assessments/model";

const TYPE_ORDER: QuestionType[] = [
  "multiple_choice",
  "multiple_answer",
  "true_false",
  "short_answer",
  "paragraph",
  "number",
];

const TRUE_FALSE_OPTIONS = [
  { id: "true", text: "" },
  { id: "false", text: "" },
];

export function QuestionEditor({
  question,
  index,
  total,
  onChange,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onRemove,
}: {
  question: AssessmentQuestion;
  index: number;
  total: number;
  onChange: (question: AssessmentQuestion) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDuplicate: () => void;
  onRemove: () => void;
}) {
  const t = useT();
  const a = t.assessments;

  function patch(next: Partial<AssessmentQuestion>) {
    onChange({ ...question, ...next });
  }

  function changeType(type: QuestionType) {
    const next: Partial<AssessmentQuestion> = { type, answerKey: null };
    if (type === "true_false") {
      next.options = TRUE_FALSE_OPTIONS;
      next.correctOptionIds = [];
    } else if (isChoiceType(type)) {
      const options =
        question.options.length >= 2 ? question.options : defaultOptionsFor(type);
      next.options = options;
      next.correctOptionIds = question.correctOptionIds.filter((id) =>
        options.some((option) => option.id === id),
      );
    } else {
      next.options = [];
      next.correctOptionIds = [];
    }
    onChange({ ...question, ...next });
  }

  function toggleCorrect(optionId: string) {
    if (question.type === "multiple_answer") {
      const has = question.correctOptionIds.includes(optionId);
      patch({
        correctOptionIds: has
          ? question.correctOptionIds.filter((id) => id !== optionId)
          : [...question.correctOptionIds, optionId],
      });
      return;
    }
    patch({
      correctOptionIds: question.correctOptionIds.includes(optionId)
        ? []
        : [optionId],
    });
  }

  const choice = isChoiceType(question.type);
  const multiple = question.type === "multiple_answer";

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-center gap-2">
        <span className="text-sm font-bold text-foreground/40">{index + 1}</span>
        <select
          value={question.type}
          onChange={(event) => changeType(event.target.value as QuestionType)}
          className="h-9 rounded-lg border border-border bg-background px-2 text-sm font-medium text-foreground outline-none focus:border-brand-400"
        >
          {TYPE_ORDER.map((type) => (
            <option key={type} value={type}>
              {a.questionTypes[type]}
            </option>
          ))}
        </select>

        <label className="ml-2 flex items-center gap-1.5 text-xs font-semibold text-foreground/60">
          {a.pointsLabel}
          <input
            type="number"
            min={0}
            max={1000}
            value={question.points}
            onChange={(event) =>
              patch({ points: Math.max(0, Number(event.target.value) || 0) })
            }
            className="h-9 w-16 rounded-lg border border-border bg-background px-2 text-sm text-foreground outline-none focus:border-brand-400"
          />
        </label>

        <div className="ml-auto flex items-center gap-0.5">
          <IconButton label={a.moveUp} onClick={onMoveUp} disabled={index === 0}>
            <ArrowUp className="h-4 w-4" />
          </IconButton>
          <IconButton
            label={a.moveDown}
            onClick={onMoveDown}
            disabled={index === total - 1}
          >
            <ArrowDown className="h-4 w-4" />
          </IconButton>
          <IconButton label={a.duplicate} onClick={onDuplicate}>
            <Copy className="h-4 w-4" />
          </IconButton>
          <IconButton label={a.removeQuestion} onClick={onRemove} danger>
            <Trash2 className="h-4 w-4" />
          </IconButton>
        </div>
      </div>

      <RichTextEditor
        value={question.prompt}
        onChange={(prompt) => patch({ prompt })}
        placeholder={a.questionPromptPlaceholder}
      />

      {choice ? (
        <div className="flex flex-col gap-2">
          {question.type === "true_false" ? (
            <TrueFalseOptions question={question} onToggle={toggleCorrect} />
          ) : (
            <>
              {question.options.map((option) => {
                const correct = question.correctOptionIds.includes(option.id);
                return (
                  <div key={option.id} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleCorrect(option.id)}
                      aria-pressed={correct}
                      title={a.correctAnswer}
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center border transition-colors",
                        multiple ? "rounded-md" : "rounded-full",
                        correct
                          ? "border-emerald-500 bg-emerald-500 text-white"
                          : "border-border text-transparent hover:border-emerald-400",
                      )}
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                    <input
                      value={option.text}
                      onChange={(event) =>
                        patch({
                          options: question.options.map((current) =>
                            current.id === option.id
                              ? { ...current, text: event.target.value }
                              : current,
                          ),
                        })
                      }
                      placeholder={a.optionPlaceholder}
                      className="h-9 min-w-0 flex-1 rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-brand-400"
                    />
                    <IconButton
                      label={a.removeQuestion}
                      onClick={() =>
                        patch({
                          options: question.options.filter(
                            (current) => current.id !== option.id,
                          ),
                          correctOptionIds: question.correctOptionIds.filter(
                            (id) => id !== option.id,
                          ),
                        })
                      }
                    >
                      <X className="h-4 w-4" />
                    </IconButton>
                  </div>
                );
              })}
              <button
                type="button"
                onClick={() =>
                  patch({
                    options: [
                      ...question.options,
                      { id: crypto.randomUUID(), text: "" },
                    ],
                  })
                }
                className="inline-flex w-fit items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-semibold text-brand-600 transition-colors hover:bg-brand-50 dark:text-brand-300 dark:hover:bg-brand-950/40"
              >
                <Plus className="h-4 w-4" />
                {a.addOption}
              </button>
            </>
          )}
        </div>
      ) : null}

      {question.type === "short_answer" || question.type === "number" ? (
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-foreground/60">
            {a.answerKey}
          </span>
          <input
            type={question.type === "number" ? "number" : "text"}
            value={question.answerKey ?? ""}
            onChange={(event) => patch({ answerKey: event.target.value || null })}
            placeholder={a.answerKeyPlaceholder}
            className="h-9 rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-brand-400"
          />
        </label>
      ) : null}
    </section>
  );
}

function TrueFalseOptions({
  question,
  onToggle,
}: {
  question: AssessmentQuestion;
  onToggle: (id: string) => void;
}) {
  const t = useT();
  return (
    <div className="flex gap-3">
      {TRUE_FALSE_OPTIONS.map((option) => {
        const correct = question.correctOptionIds.includes(option.id);
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onToggle(option.id)}
            aria-pressed={correct}
            className={cn(
              "flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors",
              correct
                ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                : "border-border text-foreground/70 hover:border-emerald-400",
            )}
          >
            <span
              className={cn(
                "h-4 w-4 rounded-full border",
                correct ? "border-emerald-500 bg-emerald-500" : "border-border",
              )}
            />
            {option.id === "true" ? t.assessments.true : t.assessments.false}
          </button>
        );
      })}
    </div>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-lg transition-colors disabled:opacity-30",
        danger
          ? "text-error/80 hover:bg-error/10 hover:text-error"
          : "text-foreground/55 hover:bg-surface-muted hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
