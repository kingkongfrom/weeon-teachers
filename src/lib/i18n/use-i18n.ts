"use client";

import { useCallback } from "react";
import { useLocale } from "@/lib/i18n/client";
import {
  tComms,
  type CommsTranslateFn,
  type TranslateVars,
} from "@/lib/i18n/translate-comms";
import type { CommsMessageKey } from "@/lib/i18n/comms-messages";

/** Flat-key translator for ported Comunicación components (tenants `comms.*` keys). */
export function useT(): (key: string, vars?: TranslateVars) => string {
  const locale = useLocale();
  return useCallback(
    (key: string, vars?: TranslateVars) => tComms(locale, key, vars),
    [locale],
  );
}
