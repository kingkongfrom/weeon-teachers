import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { GradesTable } from "@/components/grades/grades-table";
import { loadTeacherGrupo } from "@/lib/dashboard/grupos";
import { loadClassExams } from "@/lib/dashboard/exams";

export default async function GrupoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await loadTeacherGrupo(id);
  if (!detail) notFound();

  const exams = await loadClassExams(id);

  return (
    <div className="flex flex-col gap-4">
      <Link
        href="/grupos"
        className="inline-flex w-fit items-center gap-1 text-sm font-medium text-brand-700 transition-colors hover:text-brand-800 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        Todos los grupos
      </Link>

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
          students={detail.students}
          initialExams={exams}
        />
      )}
    </div>
  );
}
