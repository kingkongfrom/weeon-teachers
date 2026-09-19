import "server-only";

import { cookies } from "next/headers";
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE, type Locale } from "@/lib/i18n/config";
import type { CommsMessageKey } from "@/lib/i18n/comms-messages";
import { getMessages, type Messages } from "@/lib/i18n/messages";
import { tComms, type TranslateVars } from "@/lib/i18n/translate-comms";

/** Locale from the cookie, falling back to Spanish. */
export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  const value = store.get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

/** Server-side translator: the message catalog for the active locale. */
export async function getT(): Promise<Messages> {
  return getMessages(await getLocale());
}

/** Server-side flat comms translator for ported messaging actions. */
export async function tRequest(key: CommsMessageKey, vars?: TranslateVars): Promise<string> {
  return tComms(await getLocale(), key, vars);
}

export async function getRequestLocale(): Promise<Locale> {
  return getLocale();
}
