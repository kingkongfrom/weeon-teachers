"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  CircleAlert,
  Loader2,
  Sparkles,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocale, useT } from "@/lib/i18n/client";
import { RichTextView } from "@/components/assessments/rich-text";
import {
  answerIsCorrect,
  clampScore,
  scorePercent,
  suggestScore,
  totalFromScores,
} from "@/lib/assessments/grading";
import {
  isChoiceType,
  type Assessment,
  type AssessmentQuestion,
} from "@/lib/assessments/model";
import { gradeAssessmentSubmission } from "@/lib/teachers/grading-actions";
import type {
  AssessmentSubmissionDetail,
  SubmissionAnswer,
} from "@/lib/dashboard/submissions";

type ScoreMap = Record<string, number | null>;
type CommentMap = Record<string, string>;

function answerFor(
  submission: AssessmentSubmissionDetail,
  questionId: string,
): SubmissionAnswer | undefined {
  return submission.answers.find((answer) => answer.questionId === questionId);
}

function initialScores(
  assessment: Assessment,
  submission: AssessmentSubmissionDetail,
): ScoreMap {
  const scores: ScoreMap = {};
  for (const question of assessment.content.questions) {
    const answer = answerFor(submission, question.id);
    scores[question.id] = answer?.score ?? suggestScore(question, answer);
  }
  return scores;
}

function initialComments(submission: AssessmentSubmissionDetail): CommentMap {
  const comments: CommentMap = {};
  for (const answer of submission.answers) {
    if (answer.feedback) comments[answer.questionId] = answer.feedback;
  }
  return comments;
}

/**
 * The grader: the student's answers in view, objective questions scored from
 * the answer key, open answers scored inline, then saved straight to `grades`.
 */
export function SubmissionGrader({
  classId,
  assessment,
  submission,
  studentName,
  groupName,
}: {
  classId: string;
  assessment: Assessment;
  submission: AssessmentSubmissionDetail;
  studentName: string;
  groupName: string;
}) {
  const t = useT();
  const g = t.assessments.grading;
  const locale = useLocale();
  const router = useRouter();

  const [scores, setScores] = useState<ScoreMap>(() => initialScores(assessment, submission));
  const [comments, setComments] = useState<CommentMap>(() => initialComments(submission));
  const [feedback, setFeedback] = useState(submission.feedback ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const maxMarks = assessment.pointsTotal || 100;
  const total = Math.round(totalFromScores(scores));
  const percent = scorePercent(total, maxMarks);
  const submittedLabel = submission.submittedAt
    ? new Date(submission.submittedAt).toLocaleString(locale === "en" ? "en-US" : "es-CR", {
        day: "numeric",
        month: "long",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  function setScore(question: AssessmentQuestion, value: number | null) {
    setScores((current) => ({ ...current, [question.id]: value }));
  }

  function autoGrade() {
    setScores((current) => {
      const next = { ...current };
      for (const question of assessment.content.questions) {
        const suggestion = suggestScore(question, answerFor(submission, question.id));
        if (suggestion !== null) next[question.id] = suggestion;
      }
      return next;
    });
  }

  async function save(returnWork: boolean) {
    setSaving(true);
    setError(null);
    const res = await gradeAssessmentSubmission({
      classId,
      assessmentId: assessment.id,
      submissionId: submission.id,
      studentId: submission.studentId,
      scores: assessment.content.questions.map((question) => ({
        questionId: question.id,
        score: scores[question.id] ?? null,
        feedback: comments[question.id]?.trim() || null,
      })),
      feedback: feedback.trim() || null,
      returnWork,
    });
    setSaving(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    router.push(`/aula-virtual/${classId}/evaluaciones/${assessment.id}`);
  }

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/aula-virtual/${classId}/evaluaciones/${assessment.id}`}
          className="-ml-2.5 inline-flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-base font-semibold text-foreground/70 transition-all hover:bg-surface-muted hover:text-foreground active:scale-[0.98]"
        >
          <ArrowLeft className="h-5 w-5" />
          {g.back}
        </Link>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide",
            submission.state === "returned"
              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
              : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
          )}
        >
          {submission.state === "returned" ? g.statusReturned : g.statusPending}
        </span>
      </div>

      <section className="flex flex-wrap items-center gap-4 rounded-2xl border border-border bg-surface p-5">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl brand-gradient text-sm font-bold text-white">
          {studentName
            .split(/\s+/)
            .slice(0, 2)
            .map((part) => part[0] ?? "")
            .join("")
            .toUpperCase() || "?"}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-bold text-foreground">{studentName}</h1>
          <p className="mt-0.5 text-xs font-medium text-foreground/50">
            {assessment.title || t.assessments.untitled} · {groupName}
            {submittedLabel ? ` · ${g.submittedAt}: ${submittedLabel}` : ""}
          </p>
        </div>
      </section>

      {error ? (
        <div className="flex items-center gap-2 rounded-xl border border-error/30 bg-error/10 px-4 py-3 text-sm font-medium text-error">
          <CircleAlert className="h-4 w-4 shrink-0" />
          {error}
        </div>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex min-w-0 flex-col gap-4">
          {assessment.instructions ? (
            <div className="rounded-2xl border border-border bg-surface p-5">
              <RichTextView doc={assessment.instructions} className="text-sm" />
            </div>
          ) : null}

          {assessment.content.questions.map((question, index) => (
            <QuestionCard
              key={question.id}
              index={index}
              question={question}
              answer={answerFor(submission, question.id)}
              score={scores[question.id] ?? null}
              comment={comments[question.id] ?? ""}
              onScoreChange={(value) => setScore(question, value)}
              onCommentChange={(value) =>
                setComments((current) => ({ ...current, [question.id]: value }))
              }
            />
          ))}
        </div>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-4 lg:self-start">
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-surface p-5">
            <ScoreRing value={percent} />
            <div className="text-center">
              <p className="text-xs font-bold uppercase tracking-wide text-foreground/45">
                {g.total}
              </p>
              <p className="mt-0.5 text-2xl font-bold tabular-nums text-foreground">
                {total}
                <span className="text-base font-semibold text-foreground/40">
                  {" "}
                  / {Math.round(maxMarks)}
                </span>
              </p>
            </div>
            <button
              type="button"
              onClick={autoGrade}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-border px-3.5 py-2 text-sm font-semibold text-foreground/75 transition-colors hover:bg-surface-muted"
            >
              <Sparkles className="h-4 w-4" />
              {g.autoGrade}
            </button>
            <p className="text-center text-[11px] font-medium text-foreground/45">
              {g.autoGradeHint}
            </p>
          </div>

          <div className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-5">
            <label
              htmlFor="overall-feedback"
              className="text-xs font-bold uppercase tracking-wide text-foreground/45"
            >
              {g.overallFeedback}
            </label>
            <textarea
              id="overall-feedback"
              value={feedback}
              onChange={(event) => setFeedback(event.target.value)}
              placeholder={g.overallFeedbackPlaceholder}
              rows={4}
              maxLength={4000}
              className="w-full resize-y rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-brand-400"
            />
          </div>

          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => void save(true)}
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-full brand-gradient px-4 py-2.5 text-sm font-semibold text-white transition-all hover:brightness-105 disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {saving ? g.saving : g.saveAndReturn}
            </button>
            <button
              type="button"
              onClick={() => void save(false)}
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-border px-4 py-2.5 text-sm font-semibold text-foreground/75 transition-colors hover:bg-surface-muted disabled:opacity-60"
            >
              {g.save}
            </button>
            <p className="text-center text-[11px] font-medium text-foreground/45">
              {g.returnedHint}
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function QuestionCard({
  index,
  question,
  answer,
  score,
  comment,
  onScoreChange,
  onCommentChange,
}: {
  index: number;
  question: AssessmentQuestion;
  answer: SubmissionAnswer | undefined;
  score: number | null;
  comment: string;
  onScoreChange: (value: number | null) => void;
  onCommentChange: (value: string) => void;
}) {
  const t = useT();
  const g = t.assessments.grading;
  const correctness = answerIsCorrect(question, answer);

  function changeScore(raw: string) {
    if (raw.trim() === "") {
      onScoreChange(null);
      return;
    }
    const value = Number(raw);
    if (!Number.isFinite(value)) return;
    onScoreChange(clampScore(value, question.points));
  }

  return (
    <article className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5">
      <header className="flex items-start gap-3">
        <span className="mt-0.5 text-sm font-bold text-foreground/40">{index + 1}.</span>
        <div className="min-w-0 flex-1">
          <RichTextView doc={question.prompt} className="text-sm" />
        </div>
        <span className="shrink-0 rounded-full bg-surface-muted px-2 py-0.5 text-[11px] font-semibold text-foreground/50">
          {question.points} {t.assessments.points}
        </span>
      </header>

      <div className="rounded-xl border border-border bg-background p-3.5">
        <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-foreground/40">
          {g.studentAnswer}
        </p>
        <StudentAnswer question={question} answer={answer} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <StatusBadge correctness={correctness} />

        <div className="flex items-center gap-2">
          <input
            type="number"
            inputMode="decimal"
            min={0}
            max={question.points}
            step="0.5"
            value={score ?? ""}
            onChange={(event) => changeScore(event.target.value)}
            aria-label={g.pointsEarned}
            className="h-9 w-20 rounded-lg border border-border bg-background px-2.5 text-sm font-semibold tabular-nums text-foreground outline-none focus:border-brand-400"
          />
          <span className="text-sm font-medium text-foreground/45">
            / {question.points}
          </span>
          <button
            type="button"
            onClick={() => onScoreChange(question.points)}
            aria-label={g.correct}
            title={g.correct}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-emerald-200 text-emerald-600 transition-colors hover:bg-emerald-50 dark:border-emerald-900 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
          >
            <Check className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onScoreChange(0)}
            aria-label={g.incorrect}
            title={g.incorrect}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-rose-200 text-rose-600 transition-colors hover:bg-rose-50 dark:border-rose-900 dark:text-rose-400 dark:hover:bg-rose-950/40"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <input
        value={comment}
        onChange={(event) => onCommentChange(event.target.value)}
        placeholder={g.questionCommentPlaceholder}
        maxLength={2000}
        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-brand-400"
      />
    </article>
  );
}

function StudentAnswer({
  question,
  answer,
}: {
  question: AssessmentQuestion;
  answer: SubmissionAnswer | undefined;
}) {
  const t = useT();
  const a = t.assessments;

  if (isChoiceType(question.type)) {
    const chosen = new Set(answer?.optionIds ?? []);
    return (
      <ul className="flex flex-col gap-2">
        {question.options.map((option) => {
          const isChosen = chosen.has(option.id);
          const isCorrect = question.correctOptionIds.includes(option.id);
          return (
            <li
              key={option.id}
              className={cn(
                "flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm",
                isChosen && isCorrect
                  ? "border-emerald-300 bg-emerald-50/60 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300"
                  : isChosen
                    ? "border-rose-300 bg-rose-50/60 text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300"
                    : isCorrect
                      ? "border-emerald-200 text-foreground/70 dark:border-emerald-900"
                      : "border-border text-foreground/60",
              )}
            >
              <span className="flex items-center gap-2">
                <span
                  className={cn(
                    "h-3.5 w-3.5 shrink-0 border",
                    question.type === "multiple_answer" ? "rounded" : "rounded-full",
                    isChosen ? "border-current bg-current" : "border-border",
                  )}
                />
                {question.type === "true_false"
                  ? option.id === "true"
                    ? a.true
                    : a.false
                  : option.text || a.optionPlaceholder}
              </span>
              {isChosen ? (
                <span className="text-[11px] font-bold uppercase tracking-wide">
                  {a.grading.studentAnswer}
                </span>
              ) : null}
            </li>
          );
        })}
      </ul>
    );
  }

  const text = answer?.textValue?.trim();
  if (!text) {
    return (
      <p className="text-sm font-medium italic text-foreground/40">{a.grading.noAnswer}</p>
    );
  }
  return <p className="whitespace-pre-wrap text-sm text-foreground/80">{text}</p>;
}

function StatusBadge({ correctness }: { correctness: boolean | null }) {
  const t = useT();
  const g = t.assessments.grading;
  if (correctness === null) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-surface-muted px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-foreground/50">
        <CircleAlert className="h-3.5 w-3.5" />
        {g.manual}
      </span>
    );
  }
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide",
        correctness
          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
          : "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
      )}
    >
      {correctness ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
      {correctness ? g.correct : g.incorrect}
    </span>
  );
}

function ScoreRing({ value }: { value: number }) {
  const size = 96;
  const stroke = 9;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = (Math.max(0, Math.min(100, value)) / 100) * circumference;
  const color = value >= 70 ? "#10b981" : value >= 50 ? "#f59e0b" : "#f43f5e";

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          className="stroke-surface-muted"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
          className="transition-[stroke-dasharray] duration-500 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xl font-bold tabular-nums text-foreground">{value}%</span>
      </div>
    </div>
  );
}
