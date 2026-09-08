import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, LayoutGrid } from "lucide-react";
import { GradesTable } from "@/components/grades/grades-table";
import { SubmitReport } from "@/components/grades/submit-report";
import { loadTeacherGrupo } from "@/lib/dashboard/grupos";
import { loadClassExams } from "@/lib/dashboard/exams";
import { loadGradebookContext } from "@/lib/dashboard/gradebook";

export default async function GrupoDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ subject?: string }>;
}) {
  const { id } = await params;
  const { subject } = await searchParams;

  const detail = await loadTeacherGrupo(id);
  if (!detail) notFound();

  // Derive the teacher's (class, subject) context so we can render the pills,
  // and pick the selected subject (explicit, or the first available).
  const ctx = await loadGradebookContext();
  const currentClass = ctx.classes.find((c) => c.id === id);

  // The selected subject id: an explicit ?subject= param, else the class's first
  // subject. `null` means the "General" bucket (legacy, untagged exams).
  const hasLegacy = currentClass?.hasLegacyExams ?? false;
  const subjects = currentClass?.subjects ?? [];
  let selectedSubject: string | null = null;
  if (subject == null) {
    selectedSubject = subjects[0]?.id ?? null;
  } else if (subject === "__legacy") {
    selectedSubject = null;
  } else if (subjects.some((s) => s.id === subject)) {
    selectedSubject = subject;
  } else {
    selectedSubject = subjects[0]?.id ?? null;
  }

  const exams = await loadClassExams(id, selectedSubject);

  return (
    <div className="flex flex-col gap-5">
      <Link
        href="/grupos"
        className="inline-flex w-fit items-center gap-1 text-sm font-medium text-brand-700 transition-colors hover:text-brand-800 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        Todos los grupos
      </Link>

      <div className="flex flex-col gap-4">
        {/* Class context pills — switch groups while keeping the subject. */}
        <div className="flex flex-wrap items-center gap-2">
          {ctx.classes.map((cls) => {
            const active = cls.id === id;
            return (
              <Link
                key={cls.id}
                href={`/grupos/${cls.id}${selectedSubject ? `?subject=${selectedSubject}` : ""}`}
                className={`inline-flex h-9 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors ${
                  active
                    ? "border-brand-600 bg-brand-600 text-white"
                    : "border-border bg-surface text-foreground/70 hover:bg-surface-muted"
                }`}
              >
                <LayoutGrid className="h-4 w-4" />
                {cls.name}
              </Link>
            );
          })}
        </div>

        {/* Subject pills — one subject per gradebook, context-first. */}
        {subjects.length > 0 || hasLegacy ? (
          <div className="flex flex-wrap items-center gap-2">
            {subjects.map((subj) => {
              const active = selectedSubject === subj.id;
              return (
                <Link
                  key={subj.id}
                  href={`/grupos/${id}?subject=${subj.id}`}
                  className={`inline-flex h-8 items-center rounded-full px-3.5 text-sm font-medium transition-colors ${
                    active
                      ? "bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300"
                      : "text-foreground/60 hover:bg-surface-muted"
                  }`}
                >
                  {subj.name}
                </Link>
              );
            })}
            {hasLegacy ? (
              <Link
                href={`/grupos/${id}?subject=__legacy`}
                className={`inline-flex h-8 items-center rounded-full px-3.5 text-sm font-medium transition-colors ${
                  selectedSubject === null
                    ? "bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300"
                    : "text-foreground/60 hover:bg-surface-muted"
                }`}
              >
                General
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="flex items-baseline gap-3">
        <h1 className="brand-page-title text-2xl text-foreground sm:text-3xl">
          {detail.grupo.name}
        </h1>
        <span className="text-sm font-medium text-foreground/55">
          {detail.students.length} estudiante{detail.students.length === 1 ? "" : "s"}
        </span>
      </div>

      {detail.students.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface px-6 py-10 text-center">
          <p className="text-sm font-medium text-foreground/60">
            Este grupo aún no tiene estudiantes asignados.
          </p>
        </div>
      ) : (
        <GradesTable
          classId={id}
          subjectId={selectedSubject}
          students={detail.students}
          initialExams={exams}
        />
      )}

      {detail.students.length > 0 && exams.length > 0 ? (
        <div className="flex justify-end">
          <SubmitReport classId={id} subjectId={selectedSubject} disabled={false} />
        </div>
      ) : null}
    </div>
  );
}
