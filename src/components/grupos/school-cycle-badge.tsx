import { schoolCycleForGrade, schoolCycleName } from "@/lib/dashboard/school-cycles";
import { TONE_PILL } from "@/lib/dashboard/tones";
import type { Locale } from "@/lib/i18n/config";

const CYCLE_STYLES = {
  primaria: TONE_PILL.blue,
  secundaria: TONE_PILL.purple,
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
