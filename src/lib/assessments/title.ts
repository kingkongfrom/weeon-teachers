import type { Locale } from "@/lib/i18n/config";
import { messages } from "@/lib/i18n/messages";
import { subjectNameForLocale } from "@/lib/i18n/subject-names";

/**
 * Auto-generated assessment titles.
 *
 * An untitled task/exam is named after what it is and its subject. That name is
 * written to the database in whichever language was active at the time, so it
 * has to be recognised and re-derived — otherwise switching language leaves the
 * old wording on screen.
 *
 * Recognised shapes (any known exam/homework label in any catalog):
 *   "Examen de Ciencias" · "Tarea de Ciencias"   (es)
 *   "Science exam" · "Science homework"           (en noun form)
 *   "Exam for Ciencias"                           (older en form)
 */

function kindLabels(): string[] {
  const labels = new Set<string>();
  for (const catalog of Object.values(messages)) {
    labels.add(catalog.assessments.exam);
    labels.add(catalog.assessments.homework);
  }
  return [...labels].filter(Boolean);
}

/** True when the stored title is machine-generated rather than typed. */
export function isAutoAssessmentTitle(title: string): boolean {
  const trimmed = title.trim();
  if (!trimmed) return true;
  const lowered = trimmed.toLowerCase();
  const labels = kindLabels().map((label) => label.toLowerCase());

  // "{kind} de {subject}" / "{kind} for {subject}"
  if (labels.some((label) => lowered.startsWith(`${label} de `) || lowered.startsWith(`${label} for `))) {
    return true;
  }
  // "{subject} {kind}" — the English noun form, where the subject carries the
  // capital: "Science exam".
  return labels.some((label) => lowered.endsWith(` ${label}`));
}

/** The auto-name for this kind + subject, in the requested language. */
export function autoAssessmentTitle({
  kind,
  subject,
  locale,
}: {
  kind: "homework" | "exam";
  subject: string | null | undefined;
  locale: Locale;
}): string {
  const catalog = messages[locale] ?? messages.es;
  const a = catalog.assessments;
  const label = subjectNameForLocale(subject, locale);
  if (!label) return kind === "exam" ? a.exam : a.homework;
  return a.titleForSubject(kind === "exam" ? a.exam : a.homework, label);
}

/**
 * Title to show for an assessment: the teacher's own title, or the auto-name
 * re-derived in the current language.
 */
export function assessmentTitleFor({
  title,
  kind,
  subject,
  locale,
}: {
  title: string;
  kind: "homework" | "exam";
  subject: string | null | undefined;
  locale: Locale;
}): string {
  if (!isAutoAssessmentTitle(title)) return title.trim();
  return autoAssessmentTitle({ kind, subject, locale });
}
