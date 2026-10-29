"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  Download,
  Loader2,
  Plus,
  Save,
  Share2,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SelectMenu } from "@/components/ui/select-menu";
import {
  deleteBlooketSet,
  listBlooketSets,
  loadBlooketSet,
  saveBlooketSet,
  type SavedBlooketSet,
} from "@/lib/teachers/blooket-actions";
import { BlooketShareDialog } from "@/components/blooket/blooket-share-dialog";
import { cn } from "@/lib/utils";
import {
  BLOOKET_DEFAULT_SECONDS,
  BLOOKET_MAX_ANSWERS,
  blooketFileName,
  skipReasonLabel,
  toBlooketCsv,
  toBlooketSet,
  type BlooketSkipReason,
} from "@/lib/assessments/blooket-csv";
import { newId, type QuestionType } from "@/lib/assessments/model";

/** The three shapes Blooket can play. Everything else has no equivalent. */
type BlooketKind = "multiple_choice" | "true_false" | "typed";

type DraftQuestion = {
  id: string;
  kind: BlooketKind;
  prompt: string;
  options: string[];
  /** Indexes into `options`; for typed questions the single answer key. */
  correct: number[];
  answerKey: string;
  seconds: number;
};

const KIND_LABEL: Record<BlooketKind, string> = {
  multiple_choice: "Opción múltiple",
  true_false: "Verdadero / Falso",
  typed: "Respuesta escrita",
};

function blankQuestion(kind: BlooketKind): DraftQuestion {
  return {
    id: newId(),
    kind,
    prompt: "",
    options: kind === "true_false" ? ["Verdadero", "Falso"] : ["", ""],
    correct: [],
    answerKey: "",
    seconds: BLOOKET_DEFAULT_SECONDS,
  };
}

/** Adapts a builder draft to the shared model the CSV exporter understands. */
function draftToAssessmentQuestion(question: DraftQuestion) {
  const type: QuestionType =
    question.kind === "typed"
      ? "short_answer"
      : question.kind === "true_false"
        ? "true_false"
        : "multiple_choice";

  return {
    id: question.id,
    type,
    prompt: {
      type: "doc" as const,
      content: question.prompt.trim()
        ? [
            {
              type: "paragraph",
              content: [{ type: "text", text: question.prompt }],
            },
          ]
        : [{ type: "paragraph" }],
    },
    points: 1,
    options:
      question.kind === "typed"
        ? []
        : question.options.map((text, index) => ({
            id:
              question.kind === "true_false"
                ? index === 0
                  ? "true"
                  : "false"
                : `opt-${question.id}-${index}`,
            text: question.kind === "true_false" ? "" : text,
          })),
    correctOptionIds:
      question.kind === "typed"
        ? []
        : question.correct
            .slice()
            .sort((a, b) => a - b)
            .map((index) =>
              question.kind === "true_false"
                ? index === 0
                  ? "true"
                  : "false"
                : `opt-${question.id}-${index}`,
            ),
    answerKey: question.kind === "typed" ? question.answerKey : null,
  };
}

/** Finds the unique index of an option position inside the choices. */
function toggleCorrect(question: DraftQuestion, index: number): number[] {
  // Blooket answers are a single number for choice questions, so selecting one
  // replaces the previous selection instead of accumulating.
  if (question.correct.includes(index)) return [];
  return [index];
}

export function BlooketBuilder() {
  const [title, setTitle] = useState("");
  const [questions, setQuestions] = useState<DraftQuestion[]>([
    blankQuestion("multiple_choice"),
  ]);
  const [exporting, setExporting] = useState(false);
  const [gradeLevel, setGradeLevel] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [sets, setSets] = useState<SavedBlooketSet[]>([]);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareTarget, setShareTarget] = useState<SavedBlooketSet | null>(null);
  const [currentSetId, setCurrentSetId] = useState<string | null>(null);
  const [gradeFilter, setGradeFilter] = useState("");

  const refreshSets = useCallback(() => {
    void listBlooketSets().then((res) => {
      if (res.ok) setSets(res.sets);
    });
  }, []);

  useEffect(() => {
    refreshSets();
  }, [refreshSets]);

  /** Grades present in the saved sets, for the filter (same idea as the library). */
  const grades = useMemo(() => {
    const seen = new Set<string>();
    for (const saved of sets) {
      const level = saved.gradeLevel?.trim();
      if (level) seen.add(level);
    }
    return [...seen].sort((a, b) => a.localeCompare(b, "es", { numeric: true }));
  }, [sets]);

  const visibleSets = useMemo(
    () =>
      gradeFilter ? sets.filter((saved) => saved.gradeLevel === gradeFilter) : sets,
    [sets, gradeFilter],
  );

  const set = useMemo(
    () =>
      toBlooketSet({
        title,
        questions: questions.map((question) => draftToAssessmentQuestion(question)),
      }),
    [title, questions],
  );

  // A question that is still blank reports "no correct answer", which is true
  // but not actionable. Only surface problems on questions that have content.
  const problems = useMemo(
    () =>
      set.skipped.filter(
        (item) => item.reason !== "no_correct_answer" || item.prompt.trim().length > 0,
      ),
    [set.skipped],
  );

  const update = (id: string, patch: Partial<DraftQuestion>) => {
    setQuestions((current) =>
      current.map((question) => (question.id === id ? { ...question, ...patch } : question)),
    );
  };

  const canExport = set.rows.length > 0;
  const canSave = canExport && title.trim().length > 0;

  async function save() {
    if (!canSave || saving) return;
    setSaving(true);
    setSaveError(null);
    setSaveNotice(null);
    const res = await saveBlooketSet({
      id: currentSetId ?? undefined,
      title: title.trim(),
      gradeLevel: gradeLevel || null,
      rows: set.rows,
      skipped: set.skipped,
    });
    setSaving(false);
    if (!res.ok) {
      setSaveError(res.error);
      return;
    }
    setCurrentSetId(res.id ?? null);
    setSaveNotice("Set guardado en Blooket.");
    refreshSets();
  }

  async function openSet(id: string) {
    const res = await loadBlooketSet(id);
    if (!res.ok || !res.set) {
      setSaveError(res.error ?? "No se pudo abrir el set.");
      return;
    }
    setCurrentSetId(res.set.id);
    setTitle(res.set.title);
    setGradeLevel(res.set.gradeLevel ?? "");
    setQuestions(
      res.set.rows.map((row) => ({
        id: newId(),
        // A saved row keeps its answer texts; a single answer means it was a
        // typed-answer question, anything wider is a choice question.
        kind: (row.answers.length <= 1 ? "typed" : "multiple_choice") as BlooketKind,
        prompt: row.prompt,
        options: row.answers,
        // Blooket answer numbers are 1-based.
        correct: row.correct.map((n) => n - 1),
        answerKey: row.answers[0] ?? "",
        seconds: row.seconds,
      })),
    );
    setSaveNotice(`Abriendo «${res.set.title}».`);
    setSaveError(null);
  }

  async function removeSet(saved: SavedBlooketSet) {
    if (!window.confirm(`¿Eliminar «${saved.title}»?`)) return;
    const res = await deleteBlooketSet(saved.id);
    if (!res.ok) {
      setSaveError(res.error);
      return;
    }
    if (currentSetId === saved.id) setCurrentSetId(null);
    refreshSets();
  }

  function download() {
    if (!canExport) return;
    setExporting(true);
    try {
      const csv = toBlooketCsv(set, { includeTitleRow: true });
      // A BOM keeps Excel and Google Sheets from mangling Spanish accents.
      const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = blooketFileName(title || "Weeon");
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Card className="p-5 sm:p-6">
        <label
          htmlFor="blooket-title"
          className="text-sm font-semibold text-foreground"
        >
          Nombre del set
        </label>
        <input
          id="blooket-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Ciencias 8° — Repaso del sistema solar"
          className="mt-2 h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground outline-none placeholder:text-foreground/40 focus-visible:ring-2 focus-visible:ring-ring"
        />

        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div className="flex w-40 flex-col gap-1.5">
            <label
              htmlFor="blooket-grade"
              className="text-sm font-semibold text-foreground"
            >
              Nivel
            </label>
            {/* Grade is what the library filters by, so a saved set carries it.
                Free text, matching how grade_level is stored elsewhere. */}
            <input
              id="blooket-grade"
              value={gradeLevel}
              onChange={(event) => setGradeLevel(event.target.value)}
              placeholder="8°"
              maxLength={40}
              className="h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground outline-none placeholder:text-foreground/40 focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <Button
            variant="secondary"
            onClick={() => void save()}
            disabled={!canSave || saving}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {currentSetId ? "Actualizar set" : "Guardar set"}
          </Button>
        </div>

        {saveError ? (
          <p
            role="alert"
            className="mt-3 rounded-xl border border-error/25 bg-error/5 px-3 py-2 text-[13px] font-medium text-error"
          >
            {saveError}
          </p>
        ) : null}
        {saveNotice ? (
          <p className="mt-3 text-[13px] font-medium text-emerald-700 dark:text-emerald-400">
            {saveNotice}
          </p>
        ) : null}

        <p className="mt-2 text-xs text-foreground/50">
          Blooket lo usa como título; puedes cambiarlo después de importar.
        </p>
      </Card>

      {sets.length > 0 ? (
        <Card className="p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-foreground">
              Mis sets de Blooket
            </h2>
            {grades.length > 0 ? (
              <div className="w-40">
                <SelectMenu
                  value={gradeFilter}
                  onChange={setGradeFilter}
                  options={[
                    { value: "", label: "Todos los niveles" },
                    ...grades.map((level) => ({ value: level, label: level })),
                  ]}
                  label="Filtrar por nivel"
                  variant="pill"
                />
              </div>
            ) : (
              <span className="text-xs text-foreground/45">{sets.length}</span>
            )}
          </div>
          <ul className="mt-3 flex flex-col divide-y divide-border">
            {visibleSets.map((saved) => (
              <li
                key={saved.id}
                className="flex flex-wrap items-center gap-2 py-2 first:pt-0 last:pb-0"
              >
                <button
                  type="button"
                  onClick={() => void openSet(saved.id)}
                  className="min-w-0 flex-1 text-left"
                >
                  <span className="block truncate text-[13.5px] font-semibold text-foreground hover:underline">
                    {saved.title}
                  </span>
                  <span className="text-[11.5px] text-foreground/50">
                    {saved.questionCount}{" "}
                    {saved.questionCount === 1 ? "pregunta" : "preguntas"}
                    {saved.gradeLevel ? ` · ${saved.gradeLevel}` : ""}
                    {saved.shared
                      ? ` · compartido por ${saved.sharedByName || "otro docente"}`
                      : ""}
                  </span>
                </button>
                {/* A shared set belongs to someone else: open and duplicate only. */}
                {saved.shared ? null : (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setShareTarget(saved);
                        setShareOpen(true);
                      }}
                      aria-label={`Compartir ${saved.title}`}
                      title="Compartir con docentes"
                      className="flex h-7 w-7 items-center justify-center rounded-md text-foreground/35 hover:bg-surface-muted hover:text-foreground"
                    >
                      <Share2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => void removeSet(saved)}
                      aria-label={`Eliminar ${saved.title}`}
                      title="Eliminar"
                      className="flex h-7 w-7 items-center justify-center rounded-md text-foreground/35 hover:bg-error/10 hover:text-error"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {questions.map((question, index) => (
        <Card key={question.id} className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <span className="rounded-full bg-brand-600/10 px-2.5 py-1 text-xs font-semibold text-brand-700 dark:text-brand-300">
              {index + 1}
            </span>
            <div className="flex flex-1 flex-col gap-1">
              <SelectMenu
                value={question.kind}
                onChange={(value) => {
                  const kind = value as BlooketKind;
                  update(question.id, {
                    kind,
                    options:
                      kind === "true_false"
                        ? ["Verdadero", "Falso"]
                        : kind === "typed"
                          ? []
                          : ["", ""],
                    correct: [],
                    answerKey: "",
                  });
                }}
                options={(Object.keys(KIND_LABEL) as BlooketKind[]).map((kind) => ({
                  value: kind,
                  label: KIND_LABEL[kind],
                }))}
                label="Tipo de pregunta"
                className="w-56 max-w-full"
              />
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                setQuestions((current) => current.filter((item) => item.id !== question.id))
              }
              disabled={questions.length === 1}
              aria-label="Eliminar pregunta"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>

          <textarea
            value={question.prompt}
            onChange={(event) => update(question.id, { prompt: event.target.value })}
            placeholder="Escribe la pregunta"
            rows={2}
            className="mt-3 w-full resize-y rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none placeholder:text-foreground/40 focus-visible:ring-2 focus-visible:ring-ring"
          />

          {question.kind === "typed" ? (
            <input
              value={question.answerKey}
              onChange={(event) => update(question.id, { answerKey: event.target.value })}
              placeholder="Respuesta aceptada"
              className="mt-3 h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground outline-none placeholder:text-foreground/40 focus-visible:ring-2 focus-visible:ring-ring"
            />
          ) : (
            <div className="mt-3 flex flex-col gap-2">
              {question.options.map((option, optionIndex) => {
                const correct = question.correct.includes(optionIndex);
                return (
                  <div key={optionIndex} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        update(question.id, { correct: toggleCorrect(question, optionIndex) })
                      }
                      aria-pressed={correct}
                      aria-label={`Marcar como correcta: ${option || optionIndex + 1}`}
                      className={cn(
                        "grid h-8 w-8 shrink-0 place-items-center rounded-full border transition-colors",
                        correct
                          ? "border-emerald-600 bg-emerald-600 text-white"
                          : "border-border bg-surface text-foreground/30 hover:border-emerald-500",
                      )}
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <input
                      value={option}
                      onChange={(event) => {
                        const next = question.options.slice();
                        next[optionIndex] = event.target.value;
                        update(question.id, { options: next });
                      }}
                      placeholder={`Respuesta ${optionIndex + 1}`}
                      disabled={question.kind === "true_false"}
                      className="h-10 flex-1 rounded-lg border border-border bg-surface px-3 text-sm text-foreground outline-none placeholder:text-foreground/40 focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
                    />
                    {question.kind === "multiple_choice" &&
                    question.options.length > 2 ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          update(question.id, {
                            options: question.options.filter((_, i) => i !== optionIndex),
                            correct: question.correct
                              .filter((i) => i !== optionIndex)
                              .map((i) => (i > optionIndex ? i - 1 : i)),
                          })
                        }
                        aria-label="Quitar respuesta"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    ) : null}
                  </div>
                );
              })}

              {question.kind === "multiple_choice" &&
              question.options.length < BLOOKET_MAX_ANSWERS ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-fit"
                  onClick={() =>
                    update(question.id, { options: [...question.options, ""] })
                  }
                >
                  <Plus className="h-4 w-4" />
                  Añadir respuesta
                </Button>
              ) : null}
            </div>
          )}
        </Card>
      ))}

      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="secondary"
          onClick={() => setQuestions((current) => [...current, blankQuestion("multiple_choice")])}
        >
          <Plus className="h-4 w-4" />
          Añadir pregunta
        </Button>
      </div>

      <Card className="p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h2 className="text-base font-semibold text-foreground">
              Listo para Blooket
            </h2>
            <p className="text-sm text-foreground/60">
              {set.rows.length} de {questions.length}{" "}
              {questions.length === 1 ? "pregunta" : "preguntas"} se pueden exportar.
            </p>
          </div>
          <Button onClick={download} disabled={!canExport || exporting}>
            {exporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Descargar CSV
          </Button>
        </div>

        {problems.length > 0 ? (
          <ul className="mt-4 flex flex-col gap-2 border-t border-border pt-4">
            {problems.map((item) => (
              <li
                key={`${item.index}-${item.reason}`}
                className="flex items-start gap-2 text-sm text-amber-700 dark:text-amber-400"
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  <strong>Pregunta {item.index + 1}:</strong>{" "}
                  {skipReasonLabel(item.reason as BlooketSkipReason)}
                  {item.prompt ? ` — “${item.prompt}”` : ""}
                </span>
              </li>
            ))}
          </ul>
        ) : null}

        <p className="mt-4 border-t border-border pt-4 text-xs text-foreground/50">
          Descarga el archivo y súbelo en Blooket con{" "}
          <strong>Create → CSV Import</strong>. Blooket acepta hasta 4 respuestas por
          pregunta y solo opción múltiple, verdadero/falso o respuesta escrita.
        </p>
      </Card>

      <BlooketShareDialog
        open={shareOpen}
        set={shareTarget}
        onClose={() => {
          setShareOpen(false);
          setShareTarget(null);
          refreshSets();
        }}
      />
    </div>
  );
}
