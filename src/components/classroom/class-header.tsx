"use client";

import Link from "next/link";
import { ArrowLeft, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLiveT } from "@/lib/i18n/client";
import { AULA_TEAL } from "@/lib/dashboard/tones";
import { useNavMeasure, setTelemetryRoute } from "@/lib/perf/nav-timing";

export type ClassTabId = "trabajo" | "examenes" | "personas" | "asistencia" | "calificaciones";

/**
 * The class command header — one band of chrome where there used to be three.
 *
 * What it replaced: a back link, a ~220 px hero card that repeated "Aula
 * virtual" as an eyebrow above the class name, and a separate tab row. Three
 * bands before any work, and the section named three times.
 *
 * Two rows, both always present:
 *
 *   Row 1  ←  1B  ·  Weeon Demo School · 2026        [7 students]
 *   Row 2  Trabajo | Fechas | Personas | Asistencia | Notas
 *          MATERIAS  Ciencias  Español  …
 *
 * The class name never leaves the first row — the tabs scroll sideways inside
 * their own row instead, because losing the identity to fit the navigation is
 * how the first attempt failed.
 *
 * Sticky: switching subject or tab while deep in a long classwork list is the
 * most common reason to scroll back up.
 */
export function ClassHeader({
  classId,
  className,
  schoolName,
  year,
  studentCount,
  tabs,
  activeTab,
  onTabChange,
  justificationBadge,
}: {
  /** Only for the back link; the subject is not a header concern. */
  classId: string;
  className: string;
  schoolName: string | null;
  year: number;
  studentCount: number;
  tabs: Array<{ id: ClassTabId; label: string }>;
  activeTab: ClassTabId;
  onTabChange: (tab: ClassTabId) => void;
  justificationBadge: number;
}) {
  const t = useLiveT();
  const short = t.classroom.tabsShort;
  const measureTab = useNavMeasure("tab");

  return (
    <div className="sticky top-0 z-30 -mx-4 border-b border-border bg-background/90 px-4 backdrop-blur-md sm:-mx-5 sm:px-5 md:mx-0 md:rounded-2xl md:border md:px-4">
      {/* Row 1 — the class. Deliberately dominant: bigger type, its own tinted
          block, and a taller row. This is the answer to "where am I", and the
          navigation below should read as subordinate to it. */}
      <div className="flex h-14 items-center gap-2.5 sm:h-16">
        <Link
          href="/aula-virtual"
          aria-label={t.classroom.back}
          title={t.classroom.back}
          className="-ml-1.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-foreground/45 transition-colors hover:bg-surface-muted hover:text-foreground"
        >
          <ArrowLeft className="h-[17px] w-[17px]" />
        </Link>

        <div className="flex min-w-0 items-baseline gap-2">
          <h1
            className={cn(
              // 30/34px: big enough that the class name is unmistakably the
              // page title, next to 13px tabs. The gap between the two sizes is
              // what makes row 1 dominant — not decoration.
              "brand-page-title truncate text-[30px] font-bold leading-none tracking-[-0.02em] sm:text-[34px]",
              AULA_TEAL.label,
            )}
          >
            {className}
          </h1>
          <span className="hidden min-w-0 truncate pb-0.5 text-[12.5px] font-medium text-foreground/40 sm:block">
            {schoolName ?? t.common.fallbackSchool} · {year}
          </span>
        </div>

        <span
          className="ml-auto flex shrink-0 items-center gap-1.5 rounded-full bg-surface-muted/70 px-2.5 py-1 text-[11.5px] font-semibold text-foreground/60"
          title={t.grupos.studentsCount(studentCount)}
        >
          <Users className="h-3.5 w-3.5" />
          <span className="tabular-nums">{studentCount}</span>
        </span>
      </div>

      {/* Row 2 — sections. Quieter than row 1 on purpose: smaller type, no
          heading weight, and pills instead of a filled bar. */}
      <div className="flex items-center gap-2 pb-1.5">
        <nav
          role="tablist"
          aria-label={t.classroom.tabs.aria}
          className="-mx-0.5 flex min-w-0 flex-1 items-center gap-0 overflow-x-auto px-0.5 sm:gap-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {tabs.map(({ id, label }) => {
            const active = activeTab === id;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => {
                  measureTab(id);
                  setTelemetryRoute("/aula-virtual/[classId]");
                  onTabChange(id);
                }}
                className={cn(
                  // Full pill on every tab (not just the active one) so the row
                  // reads as a set of round buttons; only the active one is
                  // filled. `rounded-full` at h-[30px] gives a true capsule.
                  "inline-flex h-[30px] shrink-0 items-center gap-1 rounded-full px-2 text-[12px] font-semibold transition-colors sm:gap-1.5 sm:px-3.5 sm:text-[13px]",
                  active
                    ? "bg-[#ece5fb] text-[#4c1d95] dark:bg-[#241b45] dark:text-[#c4b5fd]"
                    : "text-foreground/50 hover:bg-surface-muted hover:text-foreground",
                )}
              >
                {/* Long labels on roomy screens, one word on a phone. */}
                <span className="hidden lg:inline">{label}</span>
                <span className="lg:hidden">{shortFor(id, short) ?? label}</span>
                {id === "asistencia" && justificationBadge > 0 ? (
                  <span className="flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-[#e11d48] px-1 text-[9px] font-bold text-white tabular-nums sm:h-4 sm:min-w-4">
                    {justificationBadge > 9 ? "9+" : justificationBadge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

function shortFor(
  id: ClassTabId,
  short: { work: string; dates: string; people: string; attendance: string; grades: string },
): string | null {
  switch (id) {
    case "trabajo":
      return short.work;
    case "examenes":
      return short.dates;
    case "personas":
      return short.people;
    case "asistencia":
      return short.attendance;
    case "calificaciones":
      return short.grades;
    default:
      return null;
  }
}
