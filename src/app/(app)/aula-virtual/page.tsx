import { Plus } from "lucide-react";
import { FadeIn } from "@/components/motion/fade-in";
import { PageHeader } from "@/components/layout/page-header";
import { ClassCard } from "@/components/classroom/class-card";
import { getTeacherSession } from "@/lib/auth/teacher-session";
import { loadSchoolName } from "@/lib/dashboard/school";
import { loadTeacherGrupos } from "@/lib/dashboard/grupos";

export const dynamic = "force-dynamic";

/**
 * Virtual classroom section — the classes grid, which navigates into each
 * class. Reached from the `/inicio` landing card.
 */
export default async function AulaVirtualPage() {
  const session = await getTeacherSession();

  const [grupos, schoolName] = await Promise.all([
    loadTeacherGrupos(),
    session ? loadSchoolName(session.tenantId) : Promise.resolve(null),
  ]);

  const year = new Date().getFullYear();

  return (
    <FadeIn className="flex min-w-0 flex-col gap-6">
      <PageHeader
        title="Aula virtual"
        description="Tus clases asignadas."
        backHref="/inicio"
      />

      {/* Classes grid. */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="brand-page-title text-xl font-bold text-foreground">Clases</h2>
          <button
            type="button"
            title="Próximamente"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 transition-colors hover:text-brand-700 dark:text-brand-300"
          >
            <Plus className="h-4 w-4" />
            Añadir clase
          </button>
        </div>

        {grupos.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border px-4 py-12 text-center">
            <p className="text-sm font-medium text-foreground/55">
              Aún no tienes clases asignadas.
            </p>
            <p className="mt-1 text-xs text-foreground/45">
              La administración del colegio te asignará tus grupos y materias.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {grupos.map((grupo) => (
              <ClassCard key={grupo.id} grupo={grupo} schoolName={schoolName} year={year} />
            ))}
          </div>
        )}
      </section>
    </FadeIn>
  );
}
