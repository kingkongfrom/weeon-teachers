"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import {
  AlignLeft,
  ArrowLeft,
  Award,
  CheckCheck,
  Eye,
  Hash,
  ListChecks,
  Loader2,
  Lock,
  Plus,
  Save,
  ToggleLeft,
  Trash2,
  Type,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/client";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DatePicker } from "@/components/ui/date-picker";
import { RichTextEditor } from "@/components/assessments/rich-text";
import { AssessmentImageProvider } from "@/components/assessments/assessment-image-context";
import { AssessmentPreview } from "@/components/assessments/assessment-preview";
import { QuestionEditor } from "@/components/assessments/question-editor";
import {
  computePointsTotal,
  emptyDoc,
  newId,
  newQuestion,
  type Assessment,
  type AssessmentContent,
  type AssessmentDraft,
  type AssessmentQuestion,
  type QuestionType,
} from "@/lib/assessments/model";
import {
  closeAssessment,
  deleteAssessment,
  saveAssessment,
  setAssessmentPublished,
} from "@/lib/teachers/assessments-actions";
import { AssessmentSubmissions } from "@/components/assessments/assessment-submissions";
import type { SubmissionSummary } from "@/lib/dashboard/submissions";

const QUESTION_TYPE_ICON = {
  multiple_choice: ListChecks,
  multiple_answer: CheckCheck,
  true_false: ToggleLeft,
  short_answer: Type,
  paragraph: AlignLeft,
  number: Hash,
} satisfies Record<QuestionType, typeof ListChecks>;

const ADD_TYPES: QuestionType[] = [
  "multiple_choice",
  "multiple_answer",
  "true_false",
  "short_answer",
  "paragraph",
  "number",
];

/** ISO timestamp → local `YYYY-MM-DD` for the date picker. */
function toDateOnly(iso: string): string {
  const date = new Date(iso);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function AssessmentEditor({
  initial,
  subjectName = null,
  studentCount = 0,
  submissions = [],
}: {
  initial: Assessment;
  /** Read-only: the subject comes from the active subject tab / the row itself,
   * so it is shown, not chosen. */
  subjectName?: string | null;
  studentCount?: number;
  submissions?: SubmissionSummary[];
}) {
  const t = useT();
  const a = t.assessments;
  const router = useRouter();

  // Once a student turns it in, the questions and their points are frozen:
  // changing them would re-score an answer against different rules. Deleting
  // every turn-in unlocks it again, so nothing is permanently stranded.
  const locked = submissions.some(
    (submission) => submission.state === "submitted" || submission.state === "returned",
  );

  const [draft, setDraft] = useState<AssessmentDraft>({
    title: initial.title,
    kind: initial.kind,
    subjectId: initial.subjectId,
    topicId: initial.topicId,
    dueAt: initial.dueAt,
    instructions: initial.instructions ?? emptyDoc(),
    content: initial.content,
  });
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  // A new assessment opens with the type picker already shown: the questions
  // must be visible immediately, not behind an extra click.
  const [addOpen, setAddOpen] = useState(initial.content.questions.length === 0);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [removeIndex, setRemoveIndex] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);
  const [closing, setClosing] = useState(false);

  const total = Math.round(computePointsTotal(draft.content));
  // Keep the empty state out of the way while the picker is open.
  const allowEmptyPrompt = draft.content.questions.length === 0 && !addOpen;

  function update(patch: Partial<AssessmentDraft>) {
    setDraft((current) => ({ ...current, ...patch }));
    setDirty(true);
    setJustSaved(false);
  }

  function updateContent(content: AssessmentContent) {
    update({ content });
  }

  function addQuestion(type: QuestionType) {
    updateContent({
      questions: [...draft.content.questions, newQuestion(type)],
    });
    setAddOpen(false);
  }

  function patchQuestion(id: string, next: AssessmentQuestion) {
    updateContent({
      questions: draft.content.questions.map((question) =>
        question.id === id ? next : question,
      ),
    });
  }

  function moveQuestion(index: number, direction: -1 | 1) {
    const target = index + direction;
    const questions = [...draft.content.questions];
    if (target < 0 || target >= questions.length) return;
    [questions[index], questions[target]] = [questions[target], questions[index]];
    updateContent({ questions });
  }

  function duplicateQuestion(index: number) {
    const source = draft.content.questions[index];
    const clone: AssessmentQuestion = {
      ...source,
      id: newId(),
      options: source.options.map((option) => ({ ...option, id: newId() })),
    };
    // Re-map correct option ids to the cloned options by position.
    clone.correctOptionIds = clone.options
      .map((option, i) => (source.correctOptionIds.includes(source.options[i].id) ? option.id : null))
      .filter((value): value is string => value !== null);

    const questions = [...draft.content.questions];
    questions.splice(index + 1, 0, clone);
    updateContent({ questions });
  }

  function removeQuestion(index: number) {
    updateContent({
      questions: draft.content.questions.filter((_, i) => i !== index),
    });
  }

  async function handleSave(): Promise<boolean> {
    setError(null);
    setSaving(true);
    // Plain-JSON clone: rich-text docs come from ProseMirror with non-plain
    // `attrs` objects, which React's server-action serializer drops (it emits a
    // temp ref). Round-tripping through JSON keeps the image `path`/`alt`.
    const plain = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
    const res = await saveAssessment({
      id: initial.id,
      classId: initial.classId,
      title: draft.title,
      kind: draft.kind,
      subjectId: draft.subjectId,
      topicId: null,
      dueAt: draft.dueAt,
      instructions: plain(draft.instructions),
      content: plain(draft.content),
    });
    setSaving(false);
    if (!res.ok) {
      setError(res.error);
      return false;
    }
    setDirty(false);
    setJustSaved(true);
    return true;
  }

  async function handleTogglePublish() {
    // Persist pending edits first so we never publish a stale draft.
    if (dirty) {
      const saved = await handleSave();
      if (!saved) return;
    }
    setError(null);
    const res = await setAssessmentPublished({
      id: initial.id,
      classId: initial.classId,
      published: !initial.published,
    });
    if (!res.ok) {
      setError(res.error);
      return;
    }
    router.refresh();
  }

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    const res = await deleteAssessment({ id: initial.id, classId: initial.classId });
    setDeleting(false);
    if (!res.ok) {
      setError(res.error);
      setDeleteOpen(false);
      return;
    }
    router.push(`/aula-virtual/${initial.classId}`);
  }

  async function handleCloseEvaluation() {
    setClosing(true);
    setError(null);
    const res = await closeAssessment({
      assessmentId: initial.id,
      classId: initial.classId,
    });
    setClosing(false);
    if (!res.ok) {
      setError(res.error);
      setCloseOpen(false);
      return;
    }
    setCloseOpen(false);
    router.refresh();
  }

  return (
    <AssessmentImageProvider value={{ classId: initial.classId, assessmentId: initial.id }}>
      <div className="flex min-w-0 flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/aula-virtual/${initial.classId}`}
          className="-ml-2.5 inline-flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm font-semibold text-foreground/60 transition-all hover:bg-surface-muted hover:text-foreground active:scale-[0.98]"
        >
          <ArrowLeft className="h-4 w-4" />
          {a.back}
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "mr-1 text-xs font-semibold",
              dirty ? "text-amber-600 dark:text-amber-400" : "text-foreground/40",
            )}
          >
            {dirty ? a.unsaved : justSaved ? a.saved : ""}
          </span>

          {/* Secondary actions sit together; publish is the primary one. */}
          <div className="flex items-center gap-0.5 rounded-full border border-border bg-surface p-0.5">
            <button
              type="button"
              onClick={() => setPreviewOpen(true)}
              className="inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-foreground/70 transition-colors hover:bg-surface-muted hover:text-foreground"
            >
              <Eye className="h-4 w-4" />
              {a.preview}
            </button>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving || !dirty || locked}
              className="inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-foreground/75 transition-colors hover:bg-surface-muted hover:text-foreground disabled:opacity-40"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {saving ? a.saving : a.save}
            </button>
          </div>

          <button
            type="button"
            disabled={locked}
            onClick={() => void handleTogglePublish()}
            className={cn(
              "inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-sm font-semibold text-white transition-all hover:brightness-105 active:scale-[0.98]",
              initial.published ? "bg-amber-500" : "brand-gradient",
              locked && "cursor-not-allowed opacity-50",
            )}
          >
            {initial.published ? a.unpublish : a.publish}
          </button>
          {initial.published && !initial.closedAt ? (
            <button
              type="button"
              onClick={() => setCloseOpen(true)}
              className="inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-foreground/65 transition-colors hover:bg-surface-muted hover:text-foreground"
            >
              <Lock className="h-4 w-4" />
              {a.closeEvaluation}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setDeleteOpen(true)}
            aria-label={a.delete}
            title={a.delete}
            className="ml-1 flex h-9 w-9 items-center justify-center rounded-full text-foreground/40 transition-colors hover:bg-error/10 hover:text-error"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-error/30 bg-error/10 px-4 py-3 text-sm font-medium text-error">
          {error}
        </div>
      ) : null}

      {locked ? (
        <div className="flex items-start gap-2.5 rounded-xl border border-amber-300/50 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
          <Lock className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{a.errors.lockedSubmitted}</span>
        </div>
      ) : null}

      {initial.published ? (
        <AssessmentSubmissions
          classId={initial.classId}
          assessmentId={initial.id}
          studentCount={studentCount}
          submissions={submissions}
          maxMarks={initial.pointsTotal || total}
        />
      ) : null}

      <section className="overflow-hidden rounded-2xl border border-border bg-surface">
        {subjectName ? (
          <div className="border-b border-border bg-surface-muted/50 px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.14em] text-foreground/50">
            {subjectName}
          </div>
        ) : null}

        <div className="flex flex-col gap-5 p-5">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            {/* Kind is chosen at creation (Tarea / Examen) and frozen after. */}
            <span className="inline-flex h-7 items-center rounded-md bg-[#e6f7fb] px-2.5 text-xs font-bold uppercase tracking-wide text-[#0e6b7c] dark:bg-[#0f2f36] dark:text-[#7fdcea]">
              {initial.kind === "exam" ? a.exam : a.homework}
            </span>
            <span
              className={cn(
                "inline-flex h-7 items-center rounded-md px-2.5 text-xs font-bold uppercase tracking-wide",
                initial.closedAt
                  ? "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
                  : initial.published
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                    : "bg-surface-muted text-foreground/55",
              )}
            >
              {initial.closedAt ? a.closed : initial.published ? a.published : a.draft}
            </span>

            <span aria-hidden className="h-4 w-px bg-border" />

            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground/60">
              <ListChecks className="h-4 w-4 text-foreground/40" />
              {a.questionCount(draft.content.questions.length)}
            </span>
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground/60">
              <Award className="h-4 w-4 text-foreground/40" />
              {a.pointsTotal(total)}
            </span>
          </div>

          <input
            value={draft.title}
            readOnly={locked}
            onChange={(event) => update({ title: event.target.value })}
            placeholder={a.untitled}
            aria-label={a.title}
            className="w-full rounded-xl bg-transparent text-3xl font-bold leading-tight text-foreground outline-none transition-colors placeholder:text-foreground/30 focus:bg-surface-muted/40"
          />

          <div className="flex flex-wrap items-center gap-3">
            <DatePicker
              value={draft.dueAt ? toDateOnly(draft.dueAt) : null}
              onChange={(dateOnly) => {
                if (locked) return;
                update({
                  dueAt: dateOnly
                    ? new Date(`${dateOnly}T12:00:00`).toISOString()
                    : null,
                });
              }}
              placeholder={a.dueDate}
              clearLabel={a.clearDueDate}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5 border-t border-border px-5 pb-5 pt-4">
          <span className="text-xs font-bold uppercase tracking-[0.14em] text-foreground/45">
            {a.instructions}
          </span>
          <RichTextEditor
            value={draft.instructions ?? emptyDoc()}
            readOnly={locked}
            onChange={(instructions) => update({ instructions })}
            placeholder={a.instructionsPlaceholder}
            editorClassName="min-h-[50px]"
          />
        </div>
      </section>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-foreground/45">
            {a.questions}
          </h2>
          {draft.content.questions.length > 0 ? (
            <span className="text-xs font-semibold text-foreground/45">
              {a.questionCount(draft.content.questions.length)} · {a.pointsTotal(total)}
            </span>
          ) : null}
        </div>

        {allowEmptyPrompt ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border bg-surface-muted/30 px-6 py-8 text-center">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-surface ring-1 ring-border">
              <ListChecks className="h-5 w-5 text-foreground/40" />
            </span>
            <p className="text-sm font-semibold text-foreground/70">{a.noQuestionsTitle}</p>
            <p className="max-w-sm text-xs font-medium text-foreground/45">
              {a.noQuestionsHint}
            </p>
          </div>
        ) : null}

        {draft.content.questions.map((question, index) => (
          <QuestionEditor
            key={question.id}
            question={question}
            index={index}
            total={draft.content.questions.length}
            onChange={(next) => patchQuestion(question.id, next)}
            onMoveUp={() => moveQuestion(index, -1)}
            onMoveDown={() => moveQuestion(index, 1)}
            onDuplicate={() => duplicateQuestion(index)}
            onRemove={() => setRemoveIndex(index)}
            readOnly={locked}
          />
        ))}

        {locked ? null : addOpen ? (
          <div className="rounded-2xl border border-border bg-surface p-2 shadow-sm">
            <div className="flex items-center justify-between px-2 pb-2 pt-1">
              <span className="text-xs font-bold uppercase tracking-[0.14em] text-foreground/45">
                {a.addQuestion}
              </span>
              <button
                type="button"
                onClick={() => setAddOpen(false)}
                aria-label={a.close}
                className="flex h-7 w-7 items-center justify-center rounded-full text-foreground/45 transition-colors hover:bg-surface-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid gap-1 sm:grid-cols-2">
              {ADD_TYPES.map((type) => {
                const Icon = QUESTION_TYPE_ICON[type];
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => addQuestion(type)}
                    className="flex items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-left transition-colors hover:border-border hover:bg-surface-muted"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-muted text-foreground/55">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="flex flex-col">
                      <span className="text-sm font-semibold text-foreground/85">
                        {a.questionTypes[type]}
                      </span>
                      <span className="text-[11px] font-medium text-foreground/45">
                        {a.questionTypeHints[type]}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-border px-4 py-3 text-sm font-semibold text-foreground/65 transition-colors hover:border-brand-400 hover:bg-surface-muted/50 hover:text-foreground"
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} />
            {a.addQuestion}
          </button>
        )}
      </div>

      {typeof document !== "undefined"
        ? createPortal(
            <AnimatePresence>
              {previewOpen ? (
                <div
                  key="assessment-preview"
                  className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto p-4 sm:p-8"
                >
                  <motion.button
                    type="button"
                    aria-label={a.close}
                    onClick={() => setPreviewOpen(false)}
                    className="fixed inset-0 bg-black/40"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  />
                  <motion.div
                    role="dialog"
                    aria-modal="true"
                    aria-label={a.previewTitle}
                    className="relative z-10 w-full max-w-2xl"
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 24 }}
                    transition={{ type: "spring", stiffness: 380, damping: 34 }}
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-bold uppercase tracking-wide text-foreground/60 dark:bg-surface">
                        {a.previewTitle}
                      </span>
                      <button
                        type="button"
                        onClick={() => setPreviewOpen(false)}
                        aria-label={a.close}
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-foreground/70 transition-colors hover:bg-white hover:text-foreground dark:bg-surface dark:hover:bg-surface-muted"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                    <AssessmentPreview draft={draft} />
                  </motion.div>
                </div>
              ) : null}
            </AnimatePresence>,
            document.body,
          )
        : null}

      <ConfirmDialog
        open={removeIndex !== null}
        title={a.removeQuestionConfirm}
        confirmLabel={a.removeQuestion}
        cancelLabel={t.common.cancel}
        onConfirm={() => {
          if (removeIndex !== null) removeQuestion(removeIndex);
          setRemoveIndex(null);
        }}
        onCancel={() => setRemoveIndex(null)}
      />

      <ConfirmDialog
        open={closeOpen}
        title={a.closeEvaluationConfirm}
        description={a.closeEvaluationHint}
        confirmLabel={a.closeEvaluation}
        cancelLabel={t.common.cancel}
        pending={closing}
        onConfirm={() => void handleCloseEvaluation()}
        onCancel={() => {
          if (!closing) setCloseOpen(false);
        }}
      />

      <ConfirmDialog
        open={deleteOpen}
        title={a.deleteConfirm}
        description={draft.title || a.untitled}
        confirmLabel={a.delete}
        cancelLabel={t.classroom.materialsPanel.cancel}
        pending={deleting}
        onConfirm={() => void handleDelete()}
        onCancel={() => {
          if (!deleting) setDeleteOpen(false);
        }}
      />
      </div>
    </AssessmentImageProvider>
  );
}
