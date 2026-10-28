"use client";

import { useCallback } from "react";
import { useLiveLocale } from "@/lib/i18n/client";
import {
  tComms,
  type CommsTranslateFn,
  type TranslateVars,
} from "@/lib/i18n/translate-comms";
import type { CommsMessageKey } from "@/lib/i18n/comms-messages";

/**
 * Flat-key translator for ported Comunicación components (tenants `comms.*`
 * keys). Reads the **live** locale, so a language switch repaints these
 * strings immediately instead of waiting for the server tree to rerender.
 */
export function useT(): (key: string, vars?: TranslateVars) => string {
  const locale = useLiveLocale();
  return useCallback(
    (key: string, vars?: TranslateVars) => tComms(locale, key, vars),
    [locale],
  );
}

/** Live-locale alias, so these components share one hook name with the rest. */
export const useLiveT = useT;
