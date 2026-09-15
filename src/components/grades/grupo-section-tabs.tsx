import Link from "next/link";
import { cn } from "@/lib/utils";
import { TONE_PILL, type Tone } from "@/lib/dashboard/tones";
import { getT } from "@/lib/i18n/server";

export type GrupoSection = "grades" | "attendance" | "conduct";

const SECTION_TONE: Record<GrupoSection, Tone> = {
  grades: "purple",
  attendance: "yellow",
  conduct: "rose",
};

export async function GrupoSectionTabs({
  classId,
  active,
  subjectQuery,
}: {
  classId: string;
  active: GrupoSection;
  /** Preserve the active materia when switching back to Calificaciones. */
  subjectQuery?: string;
}) {
  const t = await getT();
  const tabs = t.grupos.tabs;

  const gradesHref =
    subjectQuery != null && subjectQuery !== ""
      ? `/grupos/${classId}?subject=${encodeURIComponent(subjectQuery)}`
      : `/grupos/${classId}`;

  const items: { id: GrupoSection; label: string; href: string }[] = [
    { id: "grades", label: tabs.grades, href: gradesHref },
    {
      id: "attendance",
      label: tabs.attendance,
      href: `/grupos/${classId}?tab=asistencia`,
    },
    { id: "conduct", label: tabs.conduct, href: `/grupos/${classId}?tab=conducta` },
  ];

  return (
    <nav
      className="no-scrollbar flex gap-2 overflow-x-auto"
      aria-label={tabs.aria}
    >
      {items.map((item) => {
        const isActive = item.id === active;
        return (
          <Link
            key={item.id}
            href={item.href}
            className={cn(
              "shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors",
              isActive
                ? cn("border border-transparent", TONE_PILL[SECTION_TONE[item.id]])
                : "ui-hover border border-border text-foreground/60 hover:text-foreground",
            )}
            aria-current={isActive ? "page" : undefined}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
