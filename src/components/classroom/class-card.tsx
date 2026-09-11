import Link from "next/link";
import { FolderOpen, Megaphone, MoreVertical, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { SubjectChips } from "@/components/grupos/subject-chips";
import { classBannerClass } from "@/lib/dashboard/class-banner";
import type { TeacherGrupo } from "@/lib/dashboard/grupos";

const ACTIONS = [
  { label: "Publicar", icon: Megaphone },
  { label: "Materiales", icon: FolderOpen },
  { label: "Más opciones", icon: MoreVertical },
] as const;

export function ClassCard({
  grupo,
  schoolName,
  year,
}: {
  grupo: TeacherGrupo;
  schoolName: string | null;
  year: number;
}) {
  const banner = classBannerClass(grupo.subjects[0]?.color);

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-surface transition-colors hover:border-brand-200 dark:hover:border-border-strong">
      <Link href={`/aula-virtual/${grupo.id}`} className="block">
        <div className={cn("relative bg-gradient-to-br px-4 py-3", banner)}>
          <p className="line-clamp-2 text-lg font-bold leading-snug text-white drop-shadow-sm">
            {grupo.name}
          </p>
          <p className="mt-0.5 text-xs font-semibold text-white/80">{year}</p>
        </div>
        <div className="px-4 pt-3">
          <p className="truncate text-xs font-medium text-foreground/50">
            {schoolName ?? "Weeon School"}
            {grupo.section ? ` · ${grupo.section}` : ""}
          </p>
        </div>
      </Link>

      <div className="flex flex-1 flex-col justify-end gap-2 px-4 pb-3 pt-2">
        {grupo.subjects.length > 0 ? <SubjectChips subjects={grupo.subjects} /> : null}
        <p className="flex items-center gap-1.5 text-xs font-medium text-foreground/50">
          <Users className="h-3.5 w-3.5" />
          {grupo.studentCount} {grupo.studentCount === 1 ? "estudiante" : "estudiantes"}
        </p>
      </div>

      <div className="flex items-center justify-end gap-0.5 border-t border-border px-2 py-1.5">
        {ACTIONS.map(({ label, icon: Icon }) => (
          <button
            key={label}
            type="button"
            title="Próximamente"
            aria-label={label}
            className="flex h-9 w-9 items-center justify-center rounded-full text-foreground/45 transition-colors hover:bg-surface-muted hover:text-foreground/70"
          >
            <Icon className="h-4 w-4" />
          </button>
        ))}
      </div>
    </article>
  );
}
