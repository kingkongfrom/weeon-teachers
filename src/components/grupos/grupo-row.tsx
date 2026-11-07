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
 * MOBILE FIRST — this was designed on desktop and the distinction collapsed on
 * a phone. At 393px both pages were "a rounded card with 1B, subject chips and
 * 7 estudiantes", because the differences were `sm:`/`lg:` only: the labelled
 * actions hid below `lg`, and the card border applied at every width.
 *
 * So on a phone this is a FLAT ROW: no card, no rounding, no shadow — a
 * divider-separated list you scan, which is what a gradebook list should feel
 * like. Aula virtual keeps its avatar-led cards, so the two stop sharing a
 * silhouette at the width where it matters most.
 *
 * From `sm:` up it becomes a bordered row (there is width for the labelled
 * actions), and the structure stays a row — it never becomes Aula virtual's
 * card.
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
      {/*
       * `relative` + the stretched `after:` overlay on the NAME link makes the
       * WHOLE ROW one click target.
       *
       * Without it only the words "1B" were clickable: the old card had a
       * stretched link, and rewriting this as a row dropped it, so tapping the
       * subject chips, the student count or the empty space did nothing —
       * exactly the report "when I click on it nothing happens".
       *
       * The action buttons below carry `relative z-10` so they stay clickable
       * on top of the overlay.
       */}
      <div
        className={cn(
          /*
           * `cursor-pointer`: the row is one click target via the stretched
           * link below, but the pointer only turned into a hand over the few
           * letters of the title — the overlay does not set it, so everything
           * else looked inert.
           */
          "relative flex cursor-pointer items-stretch gap-3 py-3.5",
          /*
           * Phone: a divider, not a box. `-mx-4 px-4` lets the divider span the
           * shell's gutter so the list reads as a table edge-to-edge, which is
           * the opposite silhouette from Aula virtual's floating card.
           */
          "-mx-4 border-b border-border px-4",
          /* sm+: a bordered row. Still a row, never a card. */
          "sm:mx-0 sm:rounded-xl sm:border sm:border-b sm:px-4",
          "transition-colors sm:hover:border-brand-300 sm:hover:bg-surface-muted/40",
        )}
      >
        {/* The accent bar: a record marker, not a banner. */}
        <span
          aria-hidden
          className="w-1 shrink-0 self-stretch rounded-full bg-gradient-to-b from-brand-500 to-brand-700"
        />

        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex min-w-0 items-baseline gap-x-2">
            <Link
              href={base}
              className="truncate text-[15px] font-bold leading-snug text-foreground decoration-foreground/25 underline-offset-2 after:absolute after:inset-0 after:z-0 after:cursor-pointer after:content-[''] hover:underline"
            >
              {grupo.name}
            </Link>
            <span className="shrink-0 text-[11px] font-semibold text-foreground/45">{year}</span>
            {grupo.section ? (
              <span className="shrink-0 text-[11px] font-medium text-foreground/45">
                · {grupo.section}
              </span>
            ) : null}
            {/* Outstanding grading rides the title line on a phone: it is the
                single number that explains why you would open this page. */}
            {pendingGrading > 0 ? (
              <span className="ml-auto shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10.5px] font-bold text-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
                {pendingGrading}
              </span>
            ) : null}
          </div>

          {grupo.subjects.length > 0 ? <SubjectChips subjects={grupo.subjects} /> : null}

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] font-medium text-foreground/50">
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" aria-hidden />
              {t.grupos.studentsCount(grupo.studentCount)}
            </span>
            <span className="truncate">{schoolName ?? t.common.fallbackSchool}</span>
          </div>
        </div>

        {/*
         * PHONE: one tap target, the whole row.
         *
         * Three labelled buttons cannot fit at 393px, and three unlabelled
         * icons are unguessable — which is what made this look like Aula
         * virtual's icon footer. One chevron is honest about the gesture.
         */}
        <Link
          href={base}
          aria-label={`${t.grupos.openGroup} — ${grupo.name}`}
          className="relative z-10 flex w-8 shrink-0 items-center justify-center rounded-lg text-foreground/30 transition-colors group-hover:text-foreground/60 sm:hidden"
        >
          <ChevronRight className="h-4 w-4" aria-hidden />
        </Link>

        {/* sm+: the record actions, labelled once there is room for the text. */}
        <div className="relative z-10 hidden shrink-0 items-center gap-0.5 self-center border-l border-border pl-3 sm:flex">
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
            className="flex h-9 w-7 items-center justify-center rounded-lg text-foreground/35 transition-colors group-hover:text-foreground/70"
          >
            <ChevronRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </div>
    </li>
  );
}
