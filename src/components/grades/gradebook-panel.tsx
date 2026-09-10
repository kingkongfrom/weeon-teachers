"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AddColumnButton } from "@/components/grades/add-column-button";
import { GradesTable } from "@/components/grades/grades-table";
import { SchoolCycleBadge } from "@/components/grupos/school-cycle-badge";
import { fetchSubjectExams } from "@/lib/teachers/exams-actions";
import { subjectChipClass, subjectDotClass } from "@/lib/dashboard/lesson-colors";
import type { ClassOption, SubjectOption } from "@/lib/dashboard/gradebook";
import type { ExamColumn } from "@/lib/dashboard/exams";

type GradebookStudent = {
  id: string;
  firstName: string;
  lastName: string;
  secondLastName: string | null;
  grade: string | null;
};

type GradebookPanelProps = {
  classId: string;
  students: GradebookStudent[];
  classContext: ClassOption;
  allClasses: Array<{ id: string; name: string }>;
  initialSubjectId: string | null;
  initialExams: ExamColumn[];
};

const examsCache = new Map<string, { exams: ExamColumn[]; at: number }>();
const cacheKey = (classId: string, subjectId: string | null) =>
  `${classId}::${subjectId ?? "__legacy"}`;
const CACHE_TTL_MS = 5 * 60 * 1000;

function cacheGet(key: string): ExamColumn[] | undefined {
  const entry = examsCache.get(key);
  if (!entry) return undefined;
  if (Date.now() - entry.at > CACHE_TTL_MS) {
    examsCache.delete(key);
    return undefined;
  }
  return entry.exams;
}

function cacheSet(key: string, exams: ExamColumn[]) {
  examsCache.set(key, { exams, at: Date.now() });
}

export function GradebookPanel({
  classId,
  students,
  classContext,
  allClasses,
  initialSubjectId,
  initialExams,
}: GradebookPanelProps) {
  const [subjectId, setSubjectId] = useState<string | null>(initialSubjectId);
  const [exams, setExams] = useState<ExamColumn[]>(initialExams);
  const [loading, setLoading] = useState(false);
  const [switchError, setSwitchError] = useState<string | null>(null);
  const fetchGenerationRef = useRef(0);
  const [addControl, setAddControl] = useState<{
    addColumn: () => void;
    adding: boolean;
  } | null>(null);

  const handleAddControlReady = useCallback(
    (control: { addColumn: () => void; adding: boolean }) => {
      setAddControl(control);
    },
    [],
  );

  const persistExamsCache = useCallback(
    (next: ExamColumn[]) => {
      cacheSet(cacheKey(classId, subjectId), next);
    },
    [classId, subjectId],
  );

  const initialKey = cacheKey(classId, initialSubjectId);
  useEffect(() => {
    cacheSet(initialKey, initialExams);
  }, [initialKey, initialExams]);

  const subjects = classContext.subjects;
  const hasLegacy = classContext.hasLegacyExams;
  const subjectName =
    subjectId === null
      ? hasLegacy
        ? "Sin materia"
        : null
      : (subjects.find((subject) => subject.id === subjectId)?.name ?? null);

  async function switchSubject(next: string | null) {
    if (next === subjectId) return;

    const previousSubjectId = subjectId;
    const previousExams = exams;
    const key = cacheKey(classId, next);
    const cached = cacheGet(key);

    setSwitchError(null);

    // Drop any in-flight fetch so a stale response cannot overwrite the UI.
    fetchGenerationRef.current += 1;

    if (cached !== undefined) {
      setSubjectId(next);
      setExams(cached);
      setLoading(false);
      return;
    }

    setSubjectId(next);
    setLoading(true);
    setExams([]);

    const generation = fetchGenerationRef.current;
    const result = await fetchSubjectExams({ classId, subjectId: next });
    if (generation !== fetchGenerationRef.current) return;

    setLoading(false);
    if (result.ok) {
      cacheSet(key, result.exams);
      setExams(result.exams);
      return;
    }

    const previousCached = cacheGet(cacheKey(classId, previousSubjectId));
    setSubjectId(previousSubjectId);
    setExams(previousCached ?? previousExams);
    setSwitchError(result.error);
  }

  return (
    <div className="flex flex-col gap-6">
      {allClasses.length > 1 ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-foreground/45">
            Grupo
          </span>
          {allClasses.map((cls) => {
            const active = cls.id === classId;
            return (
              <Link
                key={cls.id}
                href={`/grupos/${cls.id}`}
                className={`inline-flex h-9 items-center rounded-full border px-4 text-sm font-medium transition-colors ${
                  active
                    ? "border-brand-600 bg-brand-600 text-white"
                    : "border-border bg-surface text-foreground/70 hover:bg-surface-muted"
                }`}
              >
                {cls.name}
              </Link>
            );
          })}
        </div>
      ) : null}

      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="brand-page-title text-2xl text-foreground sm:text-3xl">
            {classContext.name}
          </h1>
          {classContext.grade ? (
            <SchoolCycleBadge grade={classContext.grade} />
          ) : null}
        </div>
        <p className="text-sm font-medium text-foreground/55">
          {students.length} estudiante{students.length === 1 ? "" : "s"}
        </p>

        {subjects.length > 0 || hasLegacy || students.length > 0 ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            {subjects.length > 0 || hasLegacy ? (
              <SubjectTabs
                subjects={subjects}
                hasLegacy={hasLegacy}
                selectedSubjectId={subjectId}
                onSelectSubject={switchSubject}
                disabled={loading}
              />
            ) : null}
            {students.length > 0 ? (
              <AddColumnButton
                variant="labeled"
                adding={addControl?.adding ?? false}
                onClick={() => addControl?.addColumn()}
                className="shrink-0 self-start sm:self-auto"
              />
            ) : null}
          </div>
        ) : null}
        {switchError ? (
          <p className="text-xs font-medium text-error">{switchError}</p>
        ) : null}
      </header>

      {students.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface px-6 py-10 text-center">
          <p className="text-sm font-medium text-foreground/60">
            Este grupo aún no tiene estudiantes asignados.
          </p>
        </div>
      ) : (
        <GradesTable
          key={subjectId ?? "__legacy"}
          classId={classId}
          subjectId={subjectId}
          subjectName={subjectName}
          students={students}
          initialExams={exams}
          loading={loading}
          onAddControlReady={handleAddControlReady}
          onExamsPersisted={persistExamsCache}
        />
      )}

    </div>
  );
}

function SubjectTabs({
  subjects,
  hasLegacy,
  selectedSubjectId,
  onSelectSubject,
  disabled,
}: {
  subjects: SubjectOption[];
  hasLegacy: boolean;
  selectedSubjectId: string | null;
  onSelectSubject: (id: string | null) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-wrap gap-2">
      {subjects.map((subj) => {
        const active = selectedSubjectId === subj.id;
        return (
          <button
            key={subj.id}
            type="button"
            disabled={disabled}
            onClick={() => onSelectSubject(subj.id)}
            className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors disabled:opacity-60 ${
              active
                ? subjectChipClass(subj.color)
                : "border-border bg-surface text-foreground/65 hover:bg-surface-muted"
            }`}
          >
            <span
              className={`h-2 w-2 shrink-0 rounded-full ${subjectDotClass(subj.color)}`}
              aria-hidden
            />
            {subj.name}
          </button>
        );
      })}
      {hasLegacy && subjects.length === 0 ? (
        <button
          type="button"
          disabled={disabled}
          onClick={() => onSelectSubject(null)}
          className={`inline-flex cursor-pointer items-center rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors disabled:opacity-60 ${
            selectedSubjectId === null
              ? "border-brand-300 bg-brand-50 text-brand-800 dark:border-brand-700 dark:bg-brand-950/40 dark:text-brand-200"
              : "border-border bg-surface text-foreground/65 hover:bg-surface-muted"
          }`}
        >
          Sin materia
        </button>
      ) : null}
    </div>
  );
}
