"use client";

import Link from "next/link";
import { ChevronRight, FolderOpen, Presentation, Users } from "lucide-react";
import { SubjectChips } from "@/components/grupos/subject-chips";
import { useLiveT } from "@/lib/i18n/client";
import type { TeacherGrupo } from "@/lib/dashboard/grupos";
import { cn } from "@/lib/utils";
import { AULA_TEAL } from "@/lib/dashboard/tones";

/**
 * One class, as a card you browse.
 *
 * COMPACT ON A PHONE. At full size this card was 246px tall — header 96, body
 * 99, footer 49 — so three classes filled a 727px screen and a teacher with
 * eight would scroll for four screens. Measured on a Pixel 5 viewport.
 *
 * The phone layout therefore drops the footer entirely (two icons that only
 * duplicate tabs available inside the class) and moves those two actions up
 * beside the title. Avatar and padding shrink. That is roughly half the height
 * for the same information, and nothing becomes unreachable.
 *
 * From `sm:` up the original roomier card returns — there is width, and the
 * footer actions are a useful shortcut.
 */
export function ClassCard({
  grupo,
  schoolName,
  year,
}: {
  grupo: TeacherGrupo;
  schoolName: string | null;
  year: number;
}) {
  const t = useLiveT();
  const base = `/aula-virtual/${grupo.id}`;
  const actions = [
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
    <article
      className={cn(
        "group flex flex-col overflow-hidden rounded-2xl border border-border sm:rounded-3xl",
        AULA_TEAL.card,
      )}
    >
      <Link href={base} className="block">
        <div className="flex items-center gap-2.5 px-3 py-2.5 sm:items-start sm:gap-3 sm:px-4 sm:py-3">
          <span
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white sm:h-11 sm:w-11",
              AULA_TEAL.avatar,
            )}
            aria-hidden
          >
            <Presentation className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={2.2} />
          </span>
          <div className="min-w-0 flex-1">
            <p
              className={cn(
                "truncate text-[15px] font-bold leading-snug sm:line-clamp-2 sm:text-lg",
                AULA_TEAL.label,
              )}
            >
              {grupo.name}
            </p>
            <p className="mt-0.5 text-[11px] font-semibold text-foreground/55 sm:text-xs">
              {year}
            </p>
          </div>
        </div>
        <div className="px-3 pb-1 sm:px-4 sm:pt-2 sm:pb-0">
          <p className="truncate text-[11px] font-medium text-foreground/50 sm:text-xs">
            {schoolName ?? t.common.fallbackSchool}
            {grupo.section ? ` · ${grupo.section}` : ""}
          </p>
        </div>
      </Link>

      <div className="flex flex-1 items-center justify-between gap-2 px-3 pb-2.5 pt-1 sm:block sm:px-4 sm:pb-3 sm:pt-2">
        <div className="min-w-0 flex flex-1 flex-col gap-1 sm:gap-2">
          {/*
           * Phone: cap the chips at 2 so they stay on one line — five subjects
           * made this block 86px on its own. The rest become "+N" with their
           * names in its title. From `sm:` up, every chip is drawn.
           */}
          {grupo.subjects.length > 0 ? (
            <>
              <div className="sm:hidden">
                <SubjectChips subjects={grupo.subjects} max={2} />
              </div>
              <div className="hidden sm:block">
                <SubjectChips subjects={grupo.subjects} />
              </div>
            </>
          ) : null}
          <p className="flex items-center gap-1.5 text-[11px] font-medium text-foreground/50 sm:text-xs">
            <Users className="h-3 w-3 sm:h-3.5 sm:w-3.5" aria-hidden />
            {t.grupos.studentsCount(grupo.studentCount)}
          </p>
        </div>

        {/*
         * PHONE ONLY: the two shortcuts, inline. Same destinations as the
         * desktop footer, without spending a 49px strip on them.
         */}
        <div className="flex shrink-0 items-center gap-0.5 self-end sm:hidden">
          {actions.map(({ label, icon: Icon, href }) => (
            <Link
              key={label}
              href={href}
              title={label}
              aria-label={`${label} — ${grupo.name}`}
              className="flex h-8 w-8 items-center justify-center rounded-full text-foreground/45 transition-colors hover:bg-surface-muted hover:text-foreground/70"
            >
              <Icon className="h-4 w-4" aria-hidden />
            </Link>
          ))}
          <Link
            href={base}
            aria-label={`${t.grupos.openGroup} — ${grupo.name}`}
            className="flex h-8 w-7 items-center justify-center rounded-full text-foreground/35"
          >
            <ChevronRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </div>

      {/* sm+: the roomier footer shortcut, unchanged. */}
      <div className="hidden items-center justify-end gap-0.5 border-t border-border px-2 py-1.5 sm:flex">
        {actions.map(({ label, icon: Icon, href }) => (
          <Link
            key={label}
            href={href}
            title={label}
            aria-label={`${label} — ${grupo.name}`}
            className="flex h-9 w-9 items-center justify-center rounded-full text-foreground/45 transition-colors hover:bg-surface-muted hover:text-foreground/70"
          >
            <Icon className="h-4 w-4" aria-hidden />
          </Link>
        ))}
      </div>
    </article>
  );
}
