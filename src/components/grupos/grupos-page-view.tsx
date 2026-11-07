"use client";

import { PageHeader } from "@/components/layout/page-header";
import { GrupoRow } from "@/components/grupos/grupo-row";
import { useLiveT } from "@/lib/i18n/client";
import type { TeacherGrupo } from "@/lib/dashboard/grupos";

/**
 * Mis grupos — the RECORDS page, deliberately not a copy of Aula virtual.
 *
 * Both used to render the same class card, so they were indistinguishable. They
 * are different tasks: Aula virtual is where you TEACH (post work, grade
 * submissions); this is where you RECORD grades, attendance and conduct.
 *
 * So this is a list of rows you scan down, not tiles you browse — and the one
 * number worth surfacing is outstanding grading, which is what brings a teacher
 * to this page.
 */
export function GruposPageView({
  grupos,
  schoolName,
  year,
  pendingByGroup,
}: {
  grupos: TeacherGrupo[];
  schoolName: string | null;
  year: number;
  /** Group id -> submissions awaiting grading. Absent means zero. */
  pendingByGroup?: Record<string, number>;
  /** Kept for the route's existing query parameter; the list no longer branches on it. */
  tab?: string;
}) {
  const t = useLiveT();

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title={t.grupos.title} description={t.grupos.description} />

      {grupos.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface px-6 py-10 text-center">
          <p className="text-sm font-medium text-foreground/60">{t.grupos.empty}</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {grupos.map((grupo) => (
            <GrupoRow
              key={grupo.id}
              grupo={grupo}
              schoolName={schoolName}
              year={year}
              pendingGrading={pendingByGroup?.[grupo.id] ?? 0}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
