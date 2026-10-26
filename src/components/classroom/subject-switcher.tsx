"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/client";

export type SubjectOption = { id: string; name: string };

/**
 * The subject switcher, owned by the tab that filters by it.
 *
 * **Why it is not in the class header.** An earlier attempt put it there, above
 * the tabs, and Fechas de examen rendered a second copy of the same chips a few
 * pixels below. The subject is not navigation: it is the *context of the work*
 * on two specific tabs. Personas, Asistencia and Calificaciones have no subject
 * dimension, so a header-level picker sits there doing nothing.
 *
 * **It adapts to how many subjects there are**, because the two cases are
 * genuinely different jobs:
 *
 * - **One subject** (most secondary teachers): there is no choice to make, so
 *   this renders as a quiet inline label inside the section heading rather than
 *   a control. Showing a single tappable-looking chip was a false affordance —
 *   and a whole bar for it wasted vertical space.
 * - **Several** (primary teachers): a real switcher, sized to be comfortable
 *   rather than cramped, scrolling only if it must.
 *
 * One component for both tabs that use it keeps the control in the same place
 * with the same look everywhere.
 */
export function SubjectSwitcher({
  classId,
  tab,
  subjects,
  selectedSubjectId,
  className,
  /** Heading the subject is shown *next to* when there is only one. */
  inline = false,
}: {
  classId: string;
  tab: string;
  subjects: SubjectOption[];
  selectedSubjectId: string | null;
  className?: string;
  inline?: boolean;
}) {
  const t = useT();

  if (subjects.length === 0) return null;

  const current =
    subjects.find((subject) => subject.id === selectedSubjectId) ?? subjects[0];

  // A single subject is a fact about the class, not a filter.
  if (subjects.length === 1) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full bg-[#e6f7fb] px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.06em] text-[#0e6b7c] dark:bg-[#0f2f36] dark:text-[#7fdcea]",
          className,
        )}
      >
        {subjects[0].name}
      </span>
    );
  }

  // Two subjects are a toggle; more than two are a picker. Both use the same
  // control — the container just sizes itself around the labels.
  return (
    <div
      className={cn(
        "flex min-w-0 max-w-full items-center gap-2",
        inline ? "" : "flex-1",
        className,
      )}
    >
      {!inline ? (
        <span className="hidden shrink-0 text-[10px] font-bold uppercase tracking-[0.12em] text-foreground/35 sm:inline">
          {t.classroom.subjectsLabel}
        </span>
      ) : null}
      <div
        role="tablist"
        aria-label={t.classroom.subjectsLabel}
        className="flex min-w-0 items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {subjects.map((subject) => {
          const active = subject.id === current.id;
          return (
            <Link
              key={subject.id}
              role="tab"
              aria-selected={active}
              href={`/aula-virtual/${classId}?subject=${subject.id}&tab=${tab}`}
              className={cn(
                "shrink-0 rounded-full px-3 py-1.5 text-[13px] font-semibold transition-colors",
                active
                  ? "bg-[#e6f7fb] text-[#0e6b7c] ring-1 ring-inset ring-[#7dd3e8] dark:bg-[#0f2f36] dark:text-[#7fdcea] dark:ring-[#155e75]"
                  : "text-foreground/50 hover:bg-surface-muted hover:text-foreground",
              )}
            >
              {subject.name}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

/**
 * The row that carries the subject switcher above a tab's content.
 *
 * Only rendered when there is an actual choice — with one subject the switcher
 * collapses into the section heading instead, so this bar does not exist and the
 * content starts one row higher.
 */
export function SubjectBar({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-x-4 gap-y-2", className)}>
      {children}
    </div>
  );
}
