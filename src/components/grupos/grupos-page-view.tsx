"use client";

import { PageHeader } from "@/components/layout/page-header";
import { GrupoCard } from "@/components/grupos/grupo-card";
import { useLiveT } from "@/lib/i18n/client";
import type { TeacherGrupo } from "@/lib/dashboard/grupos";

/** Grupos grid — translated on the client so a language switch is instant. */
export function GruposPageView({
  grupos,
  schoolName,
  year,
  tab,
}: {
  grupos: TeacherGrupo[];
  schoolName: string | null;
  year: number;
  tab?: string;
}) {
  const t = useLiveT();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t.grupos.title} description={t.grupos.description} />

      {grupos.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface px-6 py-10 text-center">
          <p className="text-sm font-medium text-foreground/60">{t.grupos.empty}</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {grupos.map((grupo) => (
            <GrupoCard
              key={grupo.id}
              grupo={grupo}
              schoolName={schoolName}
              year={year}
              tab={tab}
            />
          ))}
        </div>
      )}
    </div>
  );
}
