"use client";

import {
  createContext,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE, type Locale } from "@/lib/i18n/config";
import { getMessages, messages, type Messages } from "@/lib/i18n/messages";

const LocaleContext = createContext<Locale>(DEFAULT_LOCALE);

export function LocaleProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: ReactNode;
}) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export function useLocale(): Locale {
  return useContext(LocaleContext);
}

/* -------------------------------------------------------------------------
 * Live locale
 *
 * Choosing a language must repaint every client label immediately — the
 * server tree (page copy) then catches up in the background. Any component
 * that renders translated chrome should read `useLiveLocale` / `useLiveT`;
 * plain `useLocale` keeps the server value for parity checks.
 * ---------------------------------------------------------------------- */

let hotLocale: Locale | null = null;
const listeners = new Set<() => void>();

function readCookieLocale(): Locale | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(`${LOCALE_COOKIE}=`));
  const value = match?.slice(LOCALE_COOKIE.length + 1);
  return isLocale(value) ? value : null;
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

function emit() {
  for (const listener of listeners) listener();
}

/** Reactive locale shared by every client subtree, without a server round-trip. */
export function useLiveLocale(): Locale {
  const providerLocale = useLocale();
  return useSyncExternalStore(
    subscribe,
    () => hotLocale ?? readCookieLocale() ?? providerLocale,
    () => providerLocale,
  );
}

/** Client-side translator: the message catalog for the active locale. */
export function useT(): Messages {
  const locale = useLocale();
  return useMemo(() => getMessages(locale), [locale]);
}

/** Translator bound to the live locale — instant language switch. */
export function useLiveT(): Messages {
  const locale = useLiveLocale();
  return useMemo(() => getMessages(locale), [locale]);
}

/**
 * Persists a locale choice. The cookie, the subscribers and every `useLiveT`
 * consumer switch synchronously; both catalogs are already bundled with the
 * layout, so `router.refresh()` only re-renders the server pages afterwards.
 */
export function useSetLocale() {
  const router = useRouter();
  return (locale: Locale) => {
    if (!isLocale(locale)) return;
    document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`;
    document.documentElement.lang = locale;
    hotLocale = locale;
    // Touch the catalog so the module is evaluated before the refresh paints.
    void messages[locale];
    emit();
    router.refresh();
  };
}
