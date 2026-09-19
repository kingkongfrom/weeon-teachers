import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";
import { commsEn, commsEs, type CommsMessageKey } from "@/lib/i18n/comms-messages";

export type TranslateVars = Record<string, string | number>;

function lookup(locale: Locale, key: string): string {
  const catalog = locale === "en" ? commsEn : commsEs;
  const fallback = locale === "en" ? commsEs : commsEn;
  return (catalog as Record<string, string>)[key] ?? (fallback as Record<string, string>)[key] ?? key;
}

export function interpolate(template: string, vars?: TranslateVars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : match,
  );
}

export function tComms(locale: Locale, key: CommsMessageKey | string, vars?: TranslateVars): string {
  return interpolate(lookup(locale, key), vars);
}

export type CommsTranslateFn = (key: CommsMessageKey, vars?: TranslateVars) => string;
