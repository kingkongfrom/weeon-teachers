import Link from "next/link";
import { Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { getTeacherSession } from "@/lib/auth/teacher-session";
import { loadTeacherGrupos } from "@/lib/dashboard/grupos";

export default async function GruposPage() {
  const session = await getTeacherSession();
  const grupos = await loadTeacherGrupos();

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="brand-page-title text-2xl text-foreground sm:text-3xl">Mis grupos</h1>
        <p className="text-sm font-medium text-foreground/55">
          {session?.role === "admin"
            ? "Vista de administración: se muestran los grupos de la institución."
            : "Solo se muestran los grupos que tiene asignados."}
        </p>
      </header>

      {grupos.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface px-6 py-10 text-center">
          <p className="text-sm font-medium text-foreground/60">
            Todavía no tiene grupos asignados. Pida a la administración que lo asigne a un grupo.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {grupos.map((grupo) => (
            <Link key={grupo.id} href={`/grupos/${grupo.id}`} className="group">
              <Card className="card-lift h-full p-5 hover:border-brand-200 hover:bg-brand-50/40">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600 group-hover:bg-brand-100 dark:bg-brand-950/40 dark:text-brand-300 dark:group-hover:bg-brand-900/50">
                  <Users className="h-6 w-6" strokeWidth={2.2} />
                </div>
                <p className="mt-4 text-base font-bold text-foreground">{grupo.name}</p>
                <p className="mt-1 text-sm text-foreground/55">
                  {[grupo.grade, grupo.section].filter(Boolean).join(" · ") || "Grupo"}
                </p>
                <p className="mt-4 text-xs font-medium text-foreground/50">
                  {grupo.studentCount === 1
                    ? "1 estudiante"
                    : `${grupo.studentCount} estudiantes`}
                </p>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
