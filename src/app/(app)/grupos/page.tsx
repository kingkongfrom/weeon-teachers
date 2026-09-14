import Link from "next/link";
import { Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { loadTeacherGrupos } from "@/lib/dashboard/grupos";
import { SchoolCycleBadge } from "@/components/grupos/school-cycle-badge";
import { SubjectChips } from "@/components/grupos/subject-chips";
import { getT, getLocale } from "@/lib/i18n/server";
import {
  CHIP_ICON,
  TONE_CARD,
  TONE_CYCLE,
  TONE_INK,
  TONE_INK_FAINT,
} from "@/lib/dashboard/tones";

export default async function GruposPage() {
  const grupos = await loadTeacherGrupos();
  const t = await getT();
  const locale = await getLocale();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t.grupos.title}
        description={t.grupos.description}
        backHref="/inicio"
      />

      {grupos.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface px-6 py-10 text-center">
          <p className="text-sm font-medium text-foreground/60">{t.grupos.empty}</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {grupos.map((grupo, index) => {
            const tone = TONE_CYCLE[index % TONE_CYCLE.length];
            return (
              <Link key={grupo.id} href={`/grupos/${grupo.id}`} className="group block h-full">
                <div
                  className={cn(
                    "flex h-full flex-col rounded-2xl p-5 ring-1 ring-inset ring-black/5 transition-all group-hover:brightness-[0.96] group-hover:ring-black/15 dark:ring-white/10 dark:group-hover:brightness-110 dark:group-hover:ring-white/20",
                    TONE_CARD[tone],
                    TONE_INK,
                  )}
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/45 dark:bg-white/10">
                    <Users className={cn("h-7 w-7", CHIP_ICON)} strokeWidth={2.2} />
                  </div>
                  <p className="mt-4 text-base font-bold">{grupo.name}</p>
                  <div className="mt-2">
                    {grupo.grade ? <SchoolCycleBadge grade={grupo.grade} locale={locale} /> : null}
                  </div>
                  <SubjectChips subjects={grupo.subjects} className="mt-3" />
                  <p className={cn("mt-auto pt-4 text-xs font-semibold", TONE_INK_FAINT)}>
                    {t.grupos.studentsCount(grupo.studentCount)}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
