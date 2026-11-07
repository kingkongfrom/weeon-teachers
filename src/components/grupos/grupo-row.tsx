"use client";

import Link from "next/link";
import { CalendarCheck, ChevronRight, GraduationCap, Shield, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { SubjectChips } from "@/components/grupos/subject-chips";
import { useLiveT } from "@/lib/i18n/client";
import type { TeacherGrupo } from "@/lib/dashboard/grupos";

/**
 * One group, as a RECORD rather than a tile.
 *
 * Mis grupos used to render the same card as Aula virtual — same banner, same
 * chips, same icon footer — so the two pages were indistinguishable. They are
 * different tasks: Aula virtual is where you TEACH (post work, grade
 * submissions), Mis grupos is where you RECORD (grades, attendance, conduct).
 *
 * So this is a row you scan down, not a tile you browse. The name anchors the
 * left, the three record actions sit right where the eye lands, and the whole
 * row is one link to Calificaciones — the reason someone opens this page.
 */
export function GrupoRow({
  grupo,
  schoolName,
  year,
  pendingGrading,
}: {
  grupo: TeacherGrupo;
  schoolName: string | null;
  year: number;
  pendingGrading: number;
}) {
  const t = useLiveT();
  const base = `/grupos/${grupo.id}`;
  const actions = [
    { label: t.grupos.tabs.grades, icon: GraduationCap, href: base },
    { label: t.grupos.tabs.attendance, icon: CalendarCheck, href: `${base}?tab=asistencia` },
    { label: t.grupos.tabs.conduct, icon: Shield, href: `${base}?tab=conducta` },
  ] as const;

  return (
    <li className="group relative">
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 transition-colors hover:border-brand-300 hover:bg-surface-muted/40 sm:flex-row sm:items-center sm:gap-5">
        {/*
         * A short accent bar instead of a banner. It marks the row as a RECORD
         * without competing with the avatar-led cards in Aula virtual.
         */}
        <div className="flex min-w-0 flex-1 items-center gap-3.5">
          <span
            aria-hidden
            className="h-10 w-1 shrink-0 rounded-full bg-gradient-to-b from-brand-500 to-brand-700"
          />
          <div className="min-w-0">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <Link
                href={base}
                className="truncate text-base font-bold leading-snug text-foreground hover:underline"
              >
                {grupo.name}
              </Link>
              <span className="text-xs font-semibold text-foreground/45">{year}</span>
              {grupo.section ? (
                <span className="text-xs font-medium text-foreground/45">· {grupo.section}</span>
              ) : null}
            </div>
            <p className="mt-0.5 truncate text-xs font-medium text-foreground/50">
              {schoolName ?? t.common.fallbackSchool}
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
              {grupo.subjects.length > 0 ? <SubjectChips subjects={grupo.subjects} /> : null}
              <span className="flex items-center gap-1 text-xs font-medium text-foreground/50">
                <Users className="h-3.5 w-3.5" aria-hidden />
                {t.grupos.studentsCount(grupo.studentCount)}
              </span>
            </div>
          </div>
        </div>

        {/*
         * THE REASON TO OPEN THIS PAGE: outstanding grading. Shown only when
         * there is something to do, so a zero never competes with a real task.
         */}
        {pendingGrading > 0 ? (
          <Link
            href="/aula-virtual/por-evaluar"
            className="flex w-fit items-center gap-2 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 ring-1 ring-amber-200 transition-colors hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-900"
          >
            <span className="relative flex h-1.5 w-1.5" aria-hidden>
              <span className="absolute inline-flex h-full w-full rounded-full bg-amber-500" />
            </span>
            {t.grupos.pendingGrading(pendingGrading)}
          </Link>
        ) : null}

        <div className="flex shrink-0 items-center gap-1 sm:border-l sm:border-border sm:pl-4">
          {actions.map(({ label, icon: Icon, href }) => (
            <Link
              key={label}
              href={href}
              title={label}
              aria-label={`${label} — ${grupo.name}`}
              className="flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-foreground/60 transition-colors hover:bg-surface-muted hover:text-foreground"
            >
              <Icon className="h-4 w-4" aria-hidden />
              <span className="hidden lg:inline">{label}</span>
            </Link>
          ))}
          <Link
            href={base}
            aria-label={`${t.grupos.openGroup} — ${grupo.name}`}
            className="flex h-9 w-8 items-center justify-center rounded-lg text-foreground/35 transition-colors group-hover:text-foreground/70"
          >
            <ChevronRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </div>
    </li>
  );
}
