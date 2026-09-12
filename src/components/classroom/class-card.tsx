import Link from "next/link";
import { FolderOpen, Megaphone, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { SubjectChips } from "@/components/grupos/subject-chips";
import { CLASS_BANNER } from "@/lib/dashboard/class-banner";
import { getT } from "@/lib/i18n/server";
import type { TeacherGrupo } from "@/lib/dashboard/grupos";

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
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-surface transition-colors hover:border-brand-200 dark:hover:border-border-strong">
      <Link href={`/aula-virtual/${grupo.id}`} className="block">
        <div className={cn("relative bg-gradient-to-br px-4 py-3", CLASS_BANNER)}>
          <p className="line-clamp-2 text-lg font-bold leading-snug">{grupo.name}</p>
          <p className="mt-0.5 text-xs font-semibold opacity-70">{year}</p>
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
