export type Locale = "es" | "en";

export const LOCALES: { value: Locale; label: string }[] = [
  { value: "es", label: "Español" },
  { value: "en", label: "English" },
];

export const LOCALE_COOKIE = "weeon.locale";
export const DEFAULT_LOCALE: Locale = "es";

export function isLocale(value: string | undefined | null): value is Locale {
  return value === "es" || value === "en";
}
