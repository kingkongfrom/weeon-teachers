import type { Locale } from "@/lib/i18n/config";

/**
 * Subject names live in the `subjects` table as the school entered them
 * (normally Spanish). The UI language is separate, so an English session was
 * showing "Ciencias" inside English sentences ("Exam for Ciencias").
 *
 * This is a name map, not a translation catalog: it only covers the standard
 * school subjects. Anything unknown is returned untouched, which is the safe
 * default — a school's own subject name is better than a wrong guess.
 */
const SUBJECT_TRANSLATIONS: Record<string, { en: string; es: string }> = {
  // Ciencias
  ciencias: { es: "Ciencias", en: "Science" },
  "ciencias naturales": { es: "Ciencias Naturales", en: "Natural Science" },
  "ciencias sociales": { es: "Ciencias Sociales", en: "Social Studies" },
  "estudios sociales": { es: "Estudios Sociales", en: "Social Studies" },
  biologia: { es: "Biología", en: "Biology" },
  "biología": { es: "Biología", en: "Biology" },
  fisica: { es: "Física", en: "Physics" },
  "física": { es: "Física", en: "Physics" },
  quimica: { es: "Química", en: "Chemistry" },
  "química": { es: "Química", en: "Chemistry" },
  // Matemática
  matematica: { es: "Matemática", en: "Mathematics" },
  "matemática": { es: "Matemática", en: "Mathematics" },
  matematicas: { es: "Matemáticas", en: "Mathematics" },
  "matemáticas": { es: "Matemáticas", en: "Mathematics" },
  "matemática aplicada": { es: "Matemática Aplicada", en: "Applied Math" },
  // Lenguas
  espanol: { es: "Español", en: "Spanish" },
  "español": { es: "Español", en: "Spanish" },
  "lengua y literatura": { es: "Lengua y Literatura", en: "Language & Literature" },
  "lengua española": { es: "Lengua Española", en: "Spanish Language" },
  ingles: { es: "Inglés", en: "English" },
  "inglés": { es: "Inglés", en: "English" },
  frances: { es: "Francés", en: "French" },
  "francés": { es: "Francés", en: "French" },
  portugues: { es: "Portugués", en: "Portuguese" },
  "portugués": { es: "Portugués", en: "Portuguese" },
  latin: { es: "Latín", en: "Latin" },
  "latín": { es: "Latín", en: "Latin" },
  // Otras
  informatica: { es: "Informática", en: "Computer Science" },
  "informática": { es: "Informática", en: "Computer Science" },
  computacion: { es: "Computación", en: "Computing" },
  "computación": { es: "Computación", en: "Computing" },
  tecnologia: { es: "Tecnología", en: "Technology" },
  "tecnología": { es: "Tecnología", en: "Technology" },
  historia: { es: "Historia", en: "History" },
  geografia: { es: "Geografía", en: "Geography" },
  "geografía": { es: "Geografía", en: "Geography" },
  "educacion civica": { es: "Educación Cívica", en: "Civics" },
  "educación cívica": { es: "Educación Cívica", en: "Civics" },
  civica: { es: "Cívica", en: "Civics" },
  "cívica": { es: "Cívica", en: "Civics" },
  filosofia: { es: "Filosofía", en: "Philosophy" },
  "filosofía": { es: "Filosofía", en: "Philosophy" },
  "educacion fisica": { es: "Educación Física", en: "Physical Education" },
  "educación física": { es: "Educación Física", en: "Physical Education" },
  "artes plasticas": { es: "Artes Plásticas", en: "Visual Arts" },
  "artes plásticas": { es: "Artes Plásticas", en: "Visual Arts" },
  artes: { es: "Artes", en: "Arts" },
  musica: { es: "Música", en: "Music" },
  "música": { es: "Música", en: "Music" },
  religion: { es: "Religión", en: "Religion" },
  "religión": { es: "Religión", en: "Religion" },
  psicologia: { es: "Psicología", en: "Psychology" },
  "psicología": { es: "Psicología", en: "Psychology" },
  economia: { es: "Economía", en: "Economics" },
  "economía": { es: "Economía", en: "Economics" },
  contabilidad: { es: "Contabilidad", en: "Accounting" },
  orientacion: { es: "Orientación", en: "Guidance" },
  "orientación": { es: "Orientación", en: "Guidance" },
};

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * The catalog entry for a stored subject name. Keys are the Spanish names, but
 * a name stored in English ("Science") resolves to the same entry — schools
 * set subjects up while the UI may be in either language.
 */
function subjectEntry(name: string): { en: string; es: string } | null {
  const key = normalize(name);
  // `Object.prototype` keys ("constructor", "toString"…) are not subjects.
  if (Object.prototype.hasOwnProperty.call(SUBJECT_TRANSLATIONS, key)) {
    return SUBJECT_TRANSLATIONS[key] ?? null;
  }
  return (
    Object.values(SUBJECT_TRANSLATIONS).find(
      (entry) => normalize(entry.en) === key || normalize(entry.es) === key,
    ) ?? null
  );
}

/**
 * Subject name in the active UI language. Unknown names come back unchanged.
 *
 *   subjectNameForLocale("Ciencias", "en") -> "Science"
 *   subjectNameForLocale("Ciencias", "es") -> "Ciencias"
 *   subjectNameForLocale("Science", "es")  -> "Ciencias"
 *   subjectNameForLocale("Robótica", "en") -> "Robótica"
 */
export function subjectNameForLocale(name: string | null | undefined, locale: Locale): string | null {
  if (!name) return null;
  const entry = subjectEntry(name);
  if (!entry) return name;
  return entry[locale] ?? name;
}

/**
 * The other language's name for a known subject, for the quiet second line
 * under a subject pill: Spanish UI shows "Science" under "Ciencias".
 *
 * Returns null when the school's subject has no known translation (or the
 * translation equals the display name), so the caller shows one line only
 * instead of repeating the same word twice.
 *
 *   subjectTranslationForLocale("Ciencias", "es") -> "Science"
 *   subjectTranslationForLocale("Ciencias", "en") -> "Ciencias"
 *   subjectTranslationForLocale("Science", "en")  -> "Ciencias"
 *   subjectTranslationForLocale("Robótica", "es") -> null
 */
export function subjectTranslationForLocale(
  name: string | null | undefined,
  locale: Locale,
): string | null {
  if (!name) return null;
  const entry = subjectEntry(name);
  if (!entry) return null;
  return locale === "en" ? otherLanguageLine(entry.es, entry.en) : otherLanguageLine(entry.en, entry.es);
}

/**
 * Second line for a subject pill: `other` only when it actually differs from
 * what the pill already shows. "Geography" / "Geografía" are the same word
 * with a different accent, so they must not repeat one above the other.
 */
function otherLanguageLine(other: string, display: string): string | null {
  if (!other || !display) return null;
  if (other === display) return null;
  const strip = (value: string) =>
    value
      .trim()
      .toLowerCase()
      .replace("\u00e1", "a")
      .replace("\u00e9", "e")
      .replace("\u00ed", "i")
      .replace("\u00f3", "o")
      .replace("\u00fa", "u")
      .replace("\u00fc", "u")
      .replace("\u00f1", "n");
  const a = strip(other);
  const b = strip(display);
  return a === b ? null : other;
}

/**
 * True when the stored name is just one language's rendering of a subject we
 * know about — i.e. an auto-name an older session wrote, which should be
 * re-derived in the current language.
 */
export function isTranslatedSubjectName(name: string): boolean {
  return subjectEntry(name) !== null;
}
