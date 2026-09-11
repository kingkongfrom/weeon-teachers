"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowLeft,
  ChevronDown,
  Eye,
  Loader2,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/client";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DatePicker } from "@/components/ui/date-picker";
import { RichTextEditor } from "@/components/assessments/rich-text";
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
  deleteAssessment,
  saveAssessment,
  setAssessmentPublished,
} from "@/lib/teachers/assessments-actions";

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

export function AssessmentEditor({ initial }: { initial: Assessment }) {
  const t = useT();
  const a = t.assessments;
  const router = useRouter();

  const [draft, setDraft] = useState<AssessmentDraft>({
    title: initial.title,
    kind: initial.kind,
    dueAt: initial.dueAt,
    instructions: initial.instructions ?? emptyDoc(),
    content: initial.content,
  });
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const total = Math.round(computePointsTotal(draft.content));

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
    const res = await saveAssessment({
      id: initial.id,
      classId: initial.classId,
      title: draft.title,
      kind: draft.kind,
      dueAt: draft.dueAt,
      instructions: draft.instructions,
      content: draft.content,
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

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/aula-virtual/${initial.classId}`}
          className="-ml-2.5 inline-flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-base font-semibold text-foreground/70 transition-all hover:bg-surface-muted hover:text-foreground active:scale-[0.98]"
        >
          <ArrowLeft className="h-5 w-5" />
          {a.back}
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "text-xs font-semibold",
              dirty ? "text-amber-600 dark:text-amber-400" : "text-foreground/40",
            )}
          >
            {dirty ? a.unsaved : justSaved ? a.saved : ""}
          </span>
          <button
            type="button"
            onClick={() => setPreviewOpen(true)}
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border px-3.5 text-sm font-semibold text-foreground/70 transition-colors hover:bg-surface-muted"
          >
            <Eye className="h-4 w-4" />
            {a.preview}
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving || !dirty}
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border px-3.5 text-sm font-semibold text-foreground/80 transition-colors hover:bg-surface-muted disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saving ? a.saving : a.save}
          </button>
          <button
            type="button"
            onClick={() => void handleTogglePublish()}
            className={cn(
              "inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-sm font-semibold text-white transition-all hover:brightness-105",
              initial.published ? "bg-amber-500" : "brand-gradient",
            )}
          >
            {initial.published ? a.unpublish : a.publish}
          </button>
          <button
            type="button"
            onClick={() => setDeleteOpen(true)}
            aria-label={a.delete}
            title={a.delete}
            className="flex h-9 w-9 items-center justify-center rounded-full text-error/80 transition-colors hover:bg-error/10 hover:text-error"
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

      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5">
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={draft.kind}
            onChange={(event) =>
              update({ kind: event.target.value as AssessmentDraft["kind"] })
            }
            className="h-9 rounded-lg border border-border bg-background px-2 text-sm font-semibold text-foreground outline-none focus:border-brand-400"
          >
            <option value="homework">{a.homework}</option>
            <option value="exam">{a.exam}</option>
          </select>
          <span
            className={cn(
              "inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide",
              initial.published
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                : "bg-surface-muted text-foreground/50",
            )}
          >
            {initial.published ? a.published : a.draft}
          </span>
          <span className="text-xs font-semibold text-foreground/50">
            {a.pointsTotal(total)} · {a.questionCount(draft.content.questions.length)}
          </span>
        </div>

        <input
          value={draft.title}
          onChange={(event) => update({ title: event.target.value })}
          placeholder={a.untitled}
          className="w-full border-b border-border bg-transparent pb-2 text-2xl font-bold text-foreground outline-none transition-colors focus:border-brand-400"
        />

        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-foreground/60">
          {a.dueDate}
          <DatePicker
            value={draft.dueAt ? toDateOnly(draft.dueAt) : null}
            onChange={(dateOnly) =>
              update({
                dueAt: dateOnly
                  ? new Date(`${dateOnly}T12:00:00`).toISOString()
                  : null,
              })
            }
            placeholder={a.dueDate}
            clearLabel={a.clearDueDate}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-foreground/60">
            {a.instructions}
          </span>
          <RichTextEditor
            value={draft.instructions ?? emptyDoc()}
            onChange={(instructions) => update({ instructions })}
            placeholder={a.instructionsPlaceholder}
          />
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <h2 className="text-sm font-bold uppercase tracking-wide text-foreground/50">
          {a.questions}
        </h2>

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
            onRemove={() => removeQuestion(index)}
          />
        ))}

        <div className="relative">
          <button
            type="button"
            onClick={() => setAddOpen((value) => !value)}
            className="inline-flex items-center gap-1.5 rounded-full brand-gradient px-4 py-2 text-sm font-semibold text-white transition-all hover:brightness-105"
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} />
            {a.addQuestion}
            <ChevronDown className="h-3.5 w-3.5" />
          </button>

          {addOpen ? (
            <div className="mt-2 grid w-full max-w-md grid-cols-2 gap-1 rounded-xl border border-border bg-surface p-2 shadow-lg">
              {ADD_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => addQuestion(type)}
                  className="rounded-lg px-3 py-2 text-left text-sm font-medium text-foreground/75 transition-colors hover:bg-surface-muted hover:text-foreground"
                >
                  {a.questionTypes[type]}
                </button>
              ))}
            </div>
          ) : null}
        </div>
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
                    className="fixed inset-0 cursor-default bg-black/40"
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
  );
}
