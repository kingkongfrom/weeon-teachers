"use client";

import { useLiveLocale } from "@/lib/i18n/client";
import type { Locale } from "@/lib/i18n/config";
import {
  subjectNameForLocale,
  subjectTranslationForLocale,
} from "@/lib/i18n/subject-names";
import { cn } from "@/lib/utils";

/**
 * The pill's two lines: the subject in the UI language, and — tight beneath it,
 * smaller — the other language's name ("Ciencias" / "Science").
 *
 * Shared by the aula virtual and the gradebook so both read the same way: the
 * name is typed once by the school in Spanish, and this is what makes an
 * English session legible without touching the `subjects` table. Subjects we do
 * not know keep a single line.
 */
export function SubjectPillLabel({
  name,
  locale,
  secondaryClassName = "text-[9.5px] opacity-55",
}: {
  name: string;
  locale?: Locale;
  /** Size/tone of the second line; layout stays the same either way. */
  secondaryClassName?: string;
}) {
  const liveLocale = useLiveLocale();
  const active = locale ?? liveLocale;

  const primary = subjectNameForLocale(name, active) ?? name;
  const secondary = subjectTranslationForLocale(name, active);

  return (
    <>
      <span className="block min-h-[1.05em] whitespace-nowrap">{primary}</span>
      <span
        aria-hidden={secondary ? undefined : true}
        className={cn(
          "mt-px block min-h-[1em] whitespace-nowrap font-medium leading-none tracking-normal",
          secondaryClassName,
          secondary ? "" : "invisible",
        )}
      >
        {secondary ?? "\u00a0"}
      </span>
    </>
  );
}
