"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { GradesTable } from "@/components/grades/grades-table";
import { SubmitReport } from "@/components/grades/submit-report";
import { fetchSubjectExams } from "@/lib/teachers/exams-actions";
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
  // The class the teacher is viewing, with its subject pills.
  classContext: ClassOption;
  // All classes (for the class pills) — switching class is a server nav.
  allClasses: Array<{ id: string; name: string }>;
  initialSubjectId: string | null;
  initialExams: ExamColumn[];
};

/**
 * Client-side cache of exams per (classId, subjectId). A subject the teacher
 * already viewed is served instantly on switch-back — no network round-trip —
 * which makes bouncing between subjects feel immediate. A short TTL lets edits
 * self-heal: within the TTL the cached snapshot is shown (instant), after it
 * the view refetches fresh data.
 */
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

function cacheDelete(key: string) {
  examsCache.delete(key);
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

  // Seed the cache for the initially-rendered subject (from the server render,
  // which is always fresh) when the mounted class+subject pair changes.
  const initialKey = cacheKey(classId, initialSubjectId);
  useEffect(() => {
    cacheSet(initialKey, initialExams);
  }, [initialKey, initialExams]);

  const subjects = classContext.subjects;
  const hasLegacy = classContext.hasLegacyExams;

  async function switchSubject(next: string | null) {
    if (next === subjectId || loading) return;

    const key = cacheKey(classId, next);
    const cached = cacheGet(key);
    // Serve from cache instantly when fresh; otherwise show a loading state
    // while fetching (and store the result for next time).
    if (cached) {
      setSubjectId(next);
      setExams(cached);
      return;
    }

    setSubjectId(next);
    setLoading(true);
    setExams([]);
    const result = await fetchSubjectExams({ classId, subjectId: next });
    setLoading(false);
    if (result.ok) {
      cacheSet(key, result.exams);
      setExams(result.exams);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Context: class pills (server nav) + subject pills (client-side). */}
      <ContextPills
        classId={classId}
        allClasses={allClasses}
        subjects={subjects}
        hasLegacy={hasLegacy}
        selectedSubjectId={subjectId}
        onSelectSubject={switchSubject}
      />

      <div className="flex items-baseline gap-3">
        <h1 className="brand-page-title text-2xl text-foreground sm:text-3xl">
          {classContext.name}
        </h1>
        <span className="text-sm font-medium text-foreground/55">
          {students.length} estudiante{students.length === 1 ? "" : "s"}
        </span>
      </div>

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
          students={students}
          initialExams={loading ? [] : exams}
          onGradeEdit={() => cacheDelete(cacheKey(classId, subjectId))}
        />
      )}

      {students.length > 0 && (loading || exams.length > 0) ? (
        <div className="flex justify-end">
          <SubmitReport classId={classId} subjectId={subjectId} disabled={loading} />
        </div>
      ) : null}
    </div>
  );
}

function ContextPills({
  classId,
  allClasses,
  subjects,
  hasLegacy,
  selectedSubjectId,
  onSelectSubject,
}: {
  classId: string;
  allClasses: Array<{ id: string; name: string }>;
  subjects: SubjectOption[];
  hasLegacy: boolean;
  selectedSubjectId: string | null;
  onSelectSubject: (id: string | null) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      {/* Class pills — full navigation since the class context changes. */}
      <div className="flex flex-wrap items-center gap-2">
        {allClasses.map((cls) => {
          const active = cls.id === classId;
          return (
            <Link
              key={cls.id}
              href={`/grupos/${cls.id}`}
              className={`inline-flex h-9 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors ${
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

      {/* Subject pills — client-side swap, no reload. */}
      {subjects.length > 0 || hasLegacy ? (
        <div className="flex flex-wrap items-center gap-2">
          {subjects.map((subj) => (
            <button
              key={subj.id}
              type="button"
              onClick={() => onSelectSubject(subj.id)}
              className={`inline-flex h-8 cursor-pointer items-center rounded-full px-3.5 text-sm font-medium transition-colors ${
                selectedSubjectId === subj.id
                  ? "bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300"
                  : "text-foreground/60 hover:bg-surface-muted"
              }`}
            >
              {subj.name}
            </button>
          ))}
          {hasLegacy ? (
            <button
              type="button"
              onClick={() => onSelectSubject(null)}
              className={`inline-flex h-8 cursor-pointer items-center rounded-full px-3.5 text-sm font-medium transition-colors ${
                selectedSubjectId === null
                  ? "bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300"
                  : "text-foreground/60 hover:bg-surface-muted"
              }`}
            >
              General
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
