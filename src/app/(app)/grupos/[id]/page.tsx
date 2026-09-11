import { notFound } from "next/navigation";
import { GradebookPanel } from "@/components/grades/gradebook-panel";
import { BackLink } from "@/components/layout/page-header";
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

  // Only the selected subject's exams are loaded server-side; switching subjects
  // happens client-side via the panel (no full reload).
  const exams = await loadClassExams(id, selectedSubject);

  return (
    <div className="flex flex-col gap-5">
      <BackLink href="/grupos" label="Todos los grupos" />

      <GradebookPanel
        classId={id}
        students={detail.students}
        classContext={
          currentClass ?? {
            id,
            name: detail.grupo.name,
            grade: detail.grupo.grade,
            section: detail.grupo.section,
            subjects: [],
            hasLegacyExams: false,
          }
        }
        allClasses={ctx.classes.map((c) => ({ id: c.id, name: c.name }))}
        initialSubjectId={selectedSubject}
        initialExams={exams}
      />
    </div>
  );
}
