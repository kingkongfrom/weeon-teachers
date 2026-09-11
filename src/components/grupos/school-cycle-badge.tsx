import { schoolCycleForGrade, schoolCycleName } from "@/lib/dashboard/school-cycles";
import type { Locale } from "@/lib/i18n/config";

const CYCLE_STYLES = {
  primaria: "bg-sky-50 text-sky-800 dark:bg-sky-950/50 dark:text-sky-300",
  secundaria: "bg-violet-50 text-violet-800 dark:bg-violet-950/50 dark:text-violet-300",
} as const;

/** Cycle pill (Primaria / Secundaria). Locale passed by the caller so this
 * stays usable from both server and client components. */
export function SchoolCycleBadge({
  grade,
  locale = "es",
  className = "",
}: {
  grade: string;
  locale?: Locale;
  className?: string;
}) {
  const cycle = schoolCycleForGrade(grade);
  if (!cycle) return null;
  return (
    <span
      className={`inline-flex w-fit items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${CYCLE_STYLES[cycle]} ${className}`}
    >
      {schoolCycleName(grade, locale)}
    </span>
  );
}
