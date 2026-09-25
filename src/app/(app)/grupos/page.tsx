import { PageHeader } from "@/components/layout/page-header";
import { GrupoCard } from "@/components/grupos/grupo-card";
import { getTeacherSession } from "@/lib/auth/teacher-session";
import { loadSchoolName } from "@/lib/dashboard/school";
import { loadTeacherGrupos } from "@/lib/dashboard/grupos";
import { getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function GruposPage() {
  const session = await getTeacherSession();
  const t = await getT();

  const [grupos, schoolName] = await Promise.all([
    loadTeacherGrupos(),
    session ? loadSchoolName(session.tenantId) : Promise.resolve(null),
  ]);

  const year = new Date().getFullYear();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t.grupos.title}
        description={t.grupos.description}
      />

      {grupos.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface px-6 py-10 text-center">
          <p className="text-sm font-medium text-foreground/60">{t.grupos.empty}</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {grupos.map((grupo) => (
            <GrupoCard key={grupo.id} grupo={grupo} schoolName={schoolName} year={year} />
          ))}
        </div>
      )}
    </div>
  );
}
