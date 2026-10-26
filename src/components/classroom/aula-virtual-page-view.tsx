"use client";

import Link from "next/link";
import { ChevronRight, ClipboardCheck, FileCheck, Library, Plus } from "lucide-react";
import { FadeIn } from "@/components/motion/fade-in";
import { PageHeader } from "@/components/layout/page-header";
import { ClassCard } from "@/components/classroom/class-card";
import { hubToneSurface, TONE_WELL } from "@/lib/dashboard/tones";
import type { TeacherGrupo } from "@/lib/dashboard/grupos";
import { useLiveT } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

/** Classroom grid — client-translated so the language switch is immediate. */
export function AulaVirtualPageView({
  grupos,
  schoolName,
  year,
  inboxCount,
  justificationCount,
}: {
  grupos: TeacherGrupo[];
  schoolName: string | null;
  year: number;
  inboxCount: number;
  justificationCount: number;
}) {
  const t = useLiveT();

  return (
    <FadeIn className="flex min-w-0 flex-col gap-6">
      <PageHeader title={t.aulaVirtual.title} description={t.aulaVirtual.description} />

      {inboxCount > 0 ? (
        <Link
          href="/aula-virtual/por-evaluar"
          className={cn(
            "flex items-center gap-3 rounded-2xl px-4 py-3 transition-colors",
            hubToneSurface("yellow"),
          )}
        >
          <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", TONE_WELL.yellow)}>
            <ClipboardCheck className="h-5 w-5" strokeWidth={2.2} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold">{t.assessments.grading.inboxTitle}</p>
            <p className="text-xs font-medium opacity-80">
              {t.assessments.grading.pendingCount(inboxCount)}
            </p>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 opacity-60" />
        </Link>
      ) : null}

      {justificationCount > 0 ? (
        <Link
          href="/aula-virtual/justificaciones"
          className={cn(
            "flex items-center gap-3 rounded-2xl px-4 py-3 transition-colors",
            hubToneSurface("rose"),
          )}
        >
          <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", TONE_WELL.rose)}>
            <FileCheck className="h-5 w-5" strokeWidth={2.2} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold">{t.attendance.inboxTitle}</p>
            <p className="text-xs font-medium opacity-80">
              {t.panel.attention.justifications(justificationCount)}
            </p>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 opacity-60" />
        </Link>
      ) : null}

      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="brand-page-title text-xl font-bold text-foreground">
            {t.aulaVirtual.classes}
          </h2>
          <button
            type="button"
            title={t.panel.upcoming}
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-semibold text-brand-600 transition-all hover:bg-brand-50 hover:text-brand-700 active:scale-[0.98] dark:text-brand-300 dark:hover:bg-brand-950/40"
          >
            <Plus className="h-4 w-4" />
            {t.aulaVirtual.addClass}
          </button>
        </div>

        {/* The reusable library sits beside the classes: it belongs to the
            teacher, not to one group, so it is not inside the grid. */}
        <Link
          href="/aula-virtual/mis-evaluaciones"
          className={cn(
            "flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3 transition-colors hover:bg-surface-muted",
          )}
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300">
            <Library className="h-5 w-5" strokeWidth={2.2} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-foreground">{t.library.title}</p>
            <p className="text-xs font-medium text-foreground/55">{t.library.description}</p>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-foreground/40" />
        </Link>

        {grupos.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border px-4 py-12 text-center">
            <p className="text-sm font-medium text-foreground/55">{t.aulaVirtual.emptyTitle}</p>
            <p className="mt-1 text-xs text-foreground/45">{t.aulaVirtual.emptyBody}</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {grupos.map((grupo) => (
              <ClassCard key={grupo.id} grupo={grupo} schoolName={schoolName} year={year} />
            ))}
          </div>
        )}
      </section>
    </FadeIn>
  );
}
