"use client";

import { ArrowDown, ArrowUp, Check, Copy, Plus, Trash2, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useLiveT } from "@/lib/i18n/client";
import { RichTextEditor } from "@/components/assessments/rich-text";
import {
  defaultMatchingOptions,
  defaultOptionsFor,
  isChoiceType,
  matchingPairCount,
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
  "matching",
];

const TRUE_FALSE_OPTIONS = [
  { id: "true", text: "" },
  { id: "false", text: "" },
];

/** True when some premise is bound to this response id. */
function isBoundElsewhere(question: AssessmentQuestion, optionId: string): boolean {
  const key = question.correctOptionIds ?? [];
  return Array.from({ length: (question.premises ?? []).length }, (_, i) => key[i]).some(
    (id) => id === optionId,
  );
}

/**
 * Pareo sizing: one pair is worth 1 point, so the pair count equals the
 * question's total points.
 *
 * This is the ONLY place the three arrays are built, which keeps them aligned:
 * `premises[i]` ↔ `correctOptionIds[i]` ↔ the response it points at. Growing
 * appends one premise plus one fresh response slot; shrinking trims from the end
 * and drops the responses that are no longer bound. Two pairs is the floor so
 * the editor never collapses while points are being typed.
 */
function resizeMatching(
  question: AssessmentQuestion,
  points: number,
): Pick<AssessmentQuestion, "premises" | "options" | "correctOptionIds"> {
  const target = Math.max(2, Math.min(20, Math.round(points) || 2));
  const currentPremises = question.premises ?? [];
  const currentKey = question.correctOptionIds ?? [];
  const currentOptions = question.options ?? [];

  // Normalise the existing key to exactly the current premise count, keeping
  // only ids that still exist as options.
  const knownIds = new Set(currentOptions.map((option) => option.id));
  const key: string[] = [];
  for (let index = 0; index < currentPremises.length; index += 1) {
    const id = currentKey[index] ?? "";
    key.push(id && knownIds.has(id) ? id : "");
  }

  if (target === currentPremises.length) {
    // Rebuild options as exactly one per premise, in premise order. This repairs
    // questions already saved with stray blank options.
    const boundOptions = key.map((id) =>
      id ? currentOptions.find((option) => option.id === id)! : { id: crypto.randomUUID(), text: "" },
    );
    // Bind the freshly minted slots so index alignment holds.
    const nextKey = boundOptions.map((option, index) => (key[index] ? key[index] : option.id));
    return { premises: currentPremises, options: boundOptions, correctOptionIds: nextKey };
  }

  if (target > currentPremises.length) {
    const added = target - currentPremises.length;
    const extraOptions = Array.from({ length: added }, () => ({
      id: crypto.randomUUID(),
      text: "",
    }));
    const existingOptions = key.map((id) =>
      id ? currentOptions.find((option) => option.id === id)! : { id: crypto.randomUUID(), text: "" },
    );
    return {
      premises: [...currentPremises, ...Array.from({ length: added }, () => "")],
      options: [...existingOptions, ...extraOptions],
      correctOptionIds: [
        ...existingOptions.map((option, index) => key[index] || option.id),
        ...extraOptions.map((option) => option.id),
      ],
    };
  }

  const keptKey = key.slice(0, target);
  const keptOptions = keptKey.map((id) =>
    id ? currentOptions.find((option) => option.id === id)! : { id: crypto.randomUUID(), text: "" },
  );
  return {
    premises: currentPremises.slice(0, target),
    options: keptOptions,
    correctOptionIds: keptOptions.map((option, index) => keptKey[index] || option.id),
  };
}

export function QuestionEditor({
  question,
  index,
  total,
  onChange,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onRemove,
  readOnly = false,
}: {
  question: AssessmentQuestion;
  index: number;
  total: number;
  onChange: (question: AssessmentQuestion) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDuplicate: () => void;
  onRemove: () => void;
  /** Locked because students already turned the assessment in. */
  readOnly?: boolean;
}) {
  const t = useLiveT();
  const a = t.assessments;

  function patch(next: Partial<AssessmentQuestion>) {
    onChange({ ...question, ...next });
  }

  function changeType(type: QuestionType) {
    const next: Partial<AssessmentQuestion> = { type, answerKey: null };
    if (type === "true_false") {
      next.options = TRUE_FALSE_OPTIONS;
      next.correctOptionIds = [];
      next.premises = undefined;
    } else if (type === "matching") {
      // Pareo: responses stay in `options`, premises index-align with the key.
      const pairs = Math.max(2, matchingPairCount(question) || 2);
      next.options =
        question.type === "matching"
          ? question.options
          : defaultMatchingOptions();
      next.premises = Array.from(
        { length: pairs },
        (_, index) => question.premises?.[index] ?? "",
      );
      next.correctOptionIds = Array.from(
        { length: pairs },
        (_, index) =>
          question.type === "matching" ? (question.correctOptionIds[index] ?? "") : "",
      );
      // Each pair is worth 1 pt (option 1), so points track the pair count.
      next.points = pairs;
    } else if (isChoiceType(type)) {
      const options =
        question.options.length >= 2 ? question.options : defaultOptionsFor(type);
      next.options = options;
      next.correctOptionIds = question.correctOptionIds.filter((id) =>
        options.some((option) => option.id === id),
      );
      next.premises = undefined;
    } else {
      next.options = [];
      next.correctOptionIds = [];
      next.premises = undefined;
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
    <section
      className={cn(
        "flex flex-col gap-4 rounded-2xl border border-border bg-surface p-4",
        readOnly && "[&_input]:cursor-not-allowed [&_input]:opacity-70",
      )}
    >
      <div className="flex items-center gap-2">
        <span className="text-sm font-bold text-foreground/40">{index + 1}</span>
        <select
          value={question.type}
          onChange={(event) => changeType(event.target.value as QuestionType)}
          disabled={readOnly}
          className="h-9 rounded-lg border border-border bg-background px-2 text-sm font-medium text-foreground outline-none focus:border-brand-400 disabled:cursor-not-allowed"
        >
          {TYPE_ORDER.map((type) => (
            <option key={type} value={type}>
              {a.questionTypes[type]}
            </option>
          ))}
        </select>

        {/* Points are the weight of the answer, so they read as a badge, not as
            one more grey field. */}
        <label
          className={cn(
            "ml-2 inline-flex h-9 items-center gap-1 rounded-xl border border-brand-200 bg-brand-50 px-2 pl-2.5 dark:border-brand-900/60 dark:bg-brand-950/40",
            readOnly && "opacity-70",
          )}
          title={a.pointsLabel}
        >
          <span className="text-[10px] font-bold uppercase tracking-wide text-brand-700 dark:text-brand-300">
            {a.pointsLabel}
          </span>
          <input
            type="number"
            min={0}
            max={1000}
            value={question.points}
            readOnly={readOnly}
            disabled={readOnly}
            aria-label={a.pointsLabel}
            onChange={(event) => {
              const points = Math.max(0, Number(event.target.value) || 0);
              // Pareo: the pair count follows the points (1 pt per pair), so
              // 10 pts means 10 pairs. Grow/shrink the two columns to match.
              if (question.type === "matching") {
                onChange({ ...question, points, ...resizeMatching(question, points) });
                return;
              }
              patch({ points });
            }}
            className="h-7 w-12 rounded-lg border-0 bg-transparent text-center text-base font-bold tabular-nums text-brand-800 outline-none focus:bg-surface focus:ring-2 focus:ring-brand-300 dark:text-brand-100"
          />
          <span className="pr-0.5 text-xs font-semibold text-brand-700/70 dark:text-brand-300/70">
            pts
          </span>
        </label>

        {readOnly ? null : (
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
        )}
      </div>

      <RichTextEditor
        value={question.prompt}
        onChange={(prompt) => patch({ prompt })}
        placeholder={a.questionPromptPlaceholder}
        readOnly={readOnly}
      />

      {question.type === "matching" ? (
        <MatchingEditor question={question} patch={patch} readOnly={readOnly} />
      ) : null}

      {choice ? (
        <div className="flex flex-col gap-2">
          {question.type === "true_false" ? (
            <TrueFalseOptions question={question} onToggle={toggleCorrect} readOnly={readOnly} />
          ) : (
            <>
              {question.options.map((option) => {
                const correct = question.correctOptionIds.includes(option.id);
                return (
                  <div key={option.id} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleCorrect(option.id)}
                      disabled={readOnly}
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
                      readOnly={readOnly}
                      disabled={readOnly}
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
                    {readOnly ? null : (
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
                    )}
                  </div>
                );
              })}
              {readOnly ? null : (
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
              )}
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
            readOnly={readOnly}
            disabled={readOnly}
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
  readOnly = false,
}: {
  question: AssessmentQuestion;
  onToggle: (id: string) => void;
  readOnly?: boolean;
}) {
  const t = useLiveT();
  return (
    <div className="flex gap-3">
      {TRUE_FALSE_OPTIONS.map((option) => {
        const correct = question.correctOptionIds.includes(option.id);
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onToggle(option.id)}
            disabled={readOnly}
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

function MatchingEditor({
  question,
  patch,
  readOnly = false,
}: {
  question: AssessmentQuestion;
  patch: (next: Partial<AssessmentQuestion>) => void;
  readOnly?: boolean;
}) {
  const a = useLiveT().assessments;
  const premises = question.premises ?? [];
  const pairs = premises.length;

  function setPremise(index: number, value: string) {
    patch({
      premises: premises.map((current, position) => (position === index ? value : current)),
    });
  }

  /** Bind (or create) the response for one premise. */
  function setResponse(index: number, text: string) {
    const key = Array.from(
      { length: pairs },
      (_, position) => question.correctOptionIds[position] ?? "",
    );
    const pairedId = key[index];
    if (pairedId) {
      patch({
        options: question.options.map((option) =>
          option.id === pairedId ? { ...option, text } : option,
        ),
      });
      return;
    }
    if (!text.trim()) return;
    // First text for this slot: mint the response and bind it in place.
    const option = { id: crypto.randomUUID(), text };
    key[index] = option.id;
    patch({ options: [...question.options, option], correctOptionIds: key });
  }

  function addPair() {
    // Points are the source of truth (1 pt per pair), so adding a pair raises
    // the total by one and lets `resizeMatching` build the matching columns.
    if (pairs >= 20) return;
    const points = Math.min(20, Math.max(pairs + 1, question.points + 1));
    patch({ ...resizeMatching(question, points), points });
  }

  function removePair(index: number) {
    // Drop the premise and the response bound to it, keeping both columns the
    // same length and the answer key index-aligned.
    const remaining = premises.filter((_, position) => position !== index);
    const key = question.correctOptionIds.filter((_, position) => position !== index);
    const bound = new Set(key.filter(Boolean));
    patch({
      premises: remaining,
      correctOptionIds: key,
      // Keep still-bound responses plus any unbound ones the teacher added.
      options: question.options.filter(
        (option) => bound.has(option.id) || !isBoundElsewhere(question, option.id),
      ),
      points: Math.max(2, remaining.length),
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-background/60 p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-xs font-semibold text-foreground/60">{a.matchingHint}</p>
        <span className="text-xs font-medium text-foreground/50">
          {a.matchingPairPoints(pairs, question.points)}
        </span>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-x-2 gap-y-2">
        <span className="text-[10px] font-bold uppercase tracking-wide text-foreground/45">
          {a.matchingPremise}
        </span>
        <span aria-hidden />
        <span className="text-[10px] font-bold uppercase tracking-wide text-foreground/45">
          {a.matchingResponse}
        </span>
        <span aria-hidden />

        {premises.map((premise, index) => (
          <MatchingPairRow
            key={index}
            index={index}
            premise={premise}
            question={question}
            readOnly={readOnly}
            onPremiseChange={(value) => setPremise(index, value)}
            onResponseChange={(text) => setResponse(index, text)}
            onRemove={() => removePair(index)}
          />
        ))}
      </div>

      {readOnly ? null : (
        <button
          type="button"
          onClick={addPair}
          disabled={pairs >= 20}
          className="inline-flex w-fit items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-semibold text-brand-600 transition-colors hover:bg-brand-50 disabled:opacity-40 dark:text-brand-300 dark:hover:bg-brand-950/40"
        >
          <Plus className="h-4 w-4" />
          {a.matchingAddPair}
        </button>
      )}

      <p className="text-xs font-medium text-foreground/45">{a.matchingDraftHint}</p>
    </div>
  );
}

/**
 * One premise/response row. The response input keeps a local draft and only
 * commits on blur or Enter — binding the option on every keystroke raced the
 * parent's re-render and reset the field.
 */
function MatchingPairRow({
  index,
  premise,
  question,
  readOnly,
  onPremiseChange,
  onResponseChange,
  onRemove,
}: {
  index: number;
  premise: string;
  question: AssessmentQuestion;
  readOnly: boolean;
  onPremiseChange: (value: string) => void;
  onResponseChange: (text: string) => void;
  onRemove: () => void;
}) {
  const a = useLiveT().assessments;
  const pairedId = question.correctOptionIds[index] ?? "";
  const stored = question.options.find((option) => option.id === pairedId)?.text ?? "";
  const [draft, setDraft] = useState(stored);

  // Keep the draft in sync when the stored response changes elsewhere
  // (pair added/removed, type switch), without clobbering what is being typed.
  const [lastStored, setLastStored] = useState(stored);
  if (stored !== lastStored) {
    setLastStored(stored);
    setDraft(stored);
  }

  function commit() {
    if (draft === stored) return;
    onResponseChange(draft);
  }

  return (
    <div className="col-span-4 grid grid-cols-subgrid items-center">
      <input
        value={premise}
        readOnly={readOnly}
        disabled={readOnly}
        aria-label={`${a.matchingPremise} ${index + 1}`}
        placeholder={a.matchingPremisePlaceholder}
        onChange={(event) => onPremiseChange(event.target.value)}
        className="h-9 min-w-0 rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-brand-400 disabled:opacity-70"
      />
      <span aria-hidden className="text-foreground/30">
        →
      </span>
      <input
        value={draft}
        readOnly={readOnly}
        disabled={readOnly}
        aria-label={`${a.matchingResponse} ${index + 1}`}
        placeholder={a.matchingResponsePlaceholder}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            commit();
            // Force the parent update to land before the next focus change.
            (event.target as HTMLInputElement).blur();
          }
        }}
        className="h-9 min-w-0 rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-brand-400 disabled:opacity-70"
      />
      {readOnly ? (
        <span aria-hidden />
      ) : (
        <IconButton label={a.removeQuestion} onClick={onRemove}>
          <X className="h-4 w-4" />
        </IconButton>
      )}
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
