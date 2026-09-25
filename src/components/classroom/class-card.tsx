import Link from "next/link";
import { FolderOpen, Megaphone, Presentation, Users } from "lucide-react";
import { SubjectChips } from "@/components/grupos/subject-chips";
import { getT } from "@/lib/i18n/server";
import type { TeacherGrupo } from "@/lib/dashboard/grupos";
import { cn } from "@/lib/utils";
import { AULA_TEAL } from "@/lib/dashboard/tones";

export async function ClassCard({
  grupo,
  schoolName,
  year,
}: {
  grupo: TeacherGrupo;
  schoolName: string | null;
  year: number;
}) {
  const t = await getT();
  const base = `/aula-virtual/${grupo.id}`;
  const actions = [
    {
      label: t.classroom.tabs.novedades,
      icon: Megaphone,
      href: `${base}?tab=novedades`,
    },
    {
      label: t.classroom.tabs.trabajo,
      icon: FolderOpen,
      href: `${base}?tab=trabajo`,
    },
    {
      label: t.classroom.tabs.personas,
      icon: Users,
      href: `${base}?tab=personas`,
    },
  ] as const;

  return (
    <article className={cn("group flex flex-col overflow-hidden rounded-3xl border border-border", AULA_TEAL.card)}>
      <Link href={`/aula-virtual/${grupo.id}`} className="block">
        <div className="flex items-start gap-3 px-4 py-3">
          <span
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white",
              AULA_TEAL.avatar,
            )}
            aria-hidden
          >
            <Presentation className="h-5 w-5" strokeWidth={2.2} />
          </span>
          <div className="min-w-0">
            <p className={cn("line-clamp-2 text-lg font-bold leading-snug", AULA_TEAL.label)}>{grupo.name}</p>
            <p className="mt-0.5 text-xs font-semibold text-foreground/55">{year}</p>
          </div>
        </div>
        <div className="px-4 pt-3">
          <p className="truncate text-xs font-medium text-foreground/50">
            {schoolName ?? t.common.fallbackSchool}
            {grupo.section ? ` · ${grupo.section}` : ""}
          </p>
        </div>
      </Link>

      <div className="flex flex-1 flex-col justify-end gap-2 px-4 pb-3 pt-2">
        {grupo.subjects.length > 0 ? <SubjectChips subjects={grupo.subjects} /> : null}
        <p className="flex items-center gap-1.5 text-xs font-medium text-foreground/50">
          <Users className="h-3.5 w-3.5" />
          {t.grupos.studentsCount(grupo.studentCount)}
        </p>
      </div>

      <div className="flex items-center justify-end gap-0.5 border-t border-border px-2 py-1.5">
        {actions.map(({ label, icon: Icon, href }) => (
          <Link
            key={label}
            href={href}
            title={label}
            aria-label={label}
            className="flex h-9 w-9 items-center justify-center rounded-full text-foreground/45 transition-colors hover:bg-surface-muted hover:text-foreground/70"
          >
            <Icon className="h-4 w-4" />
          </Link>
        ))}
      </div>
    </article>
  );
}
