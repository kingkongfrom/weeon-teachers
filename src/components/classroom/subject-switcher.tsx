"use client";

import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useLiveLocale, useLiveT } from "@/lib/i18n/client";
import type { Locale } from "@/lib/i18n/config";
import { subjectNameForLocale, subjectTranslationForLocale } from "@/lib/i18n/subject-names";
import { useNavMeasure } from "@/lib/perf/nav-timing";

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
  onSubjectChange,
}: {
  classId: string;
  tab: string;
  subjects: SubjectOption[];
  selectedSubjectId: string | null;
  className?: string;
  inline?: boolean;
  /** Called on click, before navigation, so the lists can repaint instantly. */
  onSubjectChange?: (subjectId: string) => void;
}) {
  const t = useLiveT();
  const locale = useLiveLocale();
  const router = useRouter();
  const measureSubject = useNavMeasure("subject");

  if (subjects.length === 0) return null;

  const current =
    subjects.find((subject) => subject.id === selectedSubjectId) ?? subjects[0];

  // A single subject is a fact about the class, not a filter.
  if (subjects.length === 1) {
    const primary = subjectNameForLocale(subjects[0].name, locale) ?? subjects[0].name;
    const secondary = subjectTranslationForLocale(subjects[0].name, locale);
    return (
      <span
        className={cn(
          "inline-flex flex-col items-center justify-center rounded-full bg-[#e6f7fb] px-2 py-0.5 text-center text-[11px] font-bold uppercase tracking-[0.06em] text-[#0e6b7c] dark:bg-[#0f2f36] dark:text-[#7fdcea]",
          className,
        )}
      >
        <span className="whitespace-nowrap leading-tight">{primary}</span>
        <span
          className={cn(
            "mt-px whitespace-nowrap text-[9px] font-medium normal-case leading-none tracking-normal opacity-55",
            secondary ? "" : "invisible",
          )}
        >
          {secondary ?? "\u00a0"}
        </span>
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
            <button
              key={subject.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => {
                // Repaint the filtered lists right away — no server render and
                // no skeleton. The URL then catches up in the background
                // (`replace`, so the back button is not polluted), which keeps
                // reloads and shared links on the same subject.
                measureSubject(subject.id);
                onSubjectChange?.(subject.id);
                router.replace(`/aula-virtual/${classId}?subject=${subject.id}&tab=${tab}`, {
                  scroll: false,
                });
              }}
              className={cn(
                // Two lines: `justify-center` on a flex column keeps a subject we
                // have no translation for vertically centred instead of
                // sitting on the top edge next to two-line neighbours.
                "flex shrink-0 flex-col justify-center rounded-full px-3 py-1 text-center text-[13px] font-semibold leading-tight transition-colors",
                active
                  ? "bg-[#e6f7fb] text-[#0e6b7c] ring-1 ring-inset ring-[#7dd3e8] dark:bg-[#0f2f36] dark:text-[#7fdcea] dark:ring-[#155e75]"
                  : "text-foreground/50 hover:bg-surface-muted hover:text-foreground",
              )}
            >
              <SubjectPillLabel name={subject.name} locale={locale} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * The pill's two lines: the subject in the UI language, and — tight beneath it,
 * half the size — the other language's name ("Ciencias" / "Science"). The pair
 * flips with the language switch; subjects we do not know keep one line.
 */
function SubjectPillLabel({ name, locale }: { name: string; locale: Locale }) {
  const primary = subjectNameForLocale(name, locale) ?? name;
  const secondary = subjectTranslationForLocale(name, locale);
  return (
    <>
      <span className="block min-h-[1.05em] whitespace-nowrap">{primary}</span>
      <span
        aria-hidden={secondary ? undefined : true}
        className={cn(
          "mt-px block min-h-[1em] whitespace-nowrap text-[9.5px] font-medium leading-none tracking-normal opacity-55",
          secondary ? "" : "invisible",
        )}
      >
        {secondary ?? "\u00a0"}
      </span>
    </>
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
