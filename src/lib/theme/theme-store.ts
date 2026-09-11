"use client";

import { useSyncExternalStore } from "react";
import {
  applyTheme,
  readThemePreference,
  THEME_STORAGE_KEY,
  type ThemePreference,
} from "@/lib/theme/theme";

const listeners = new Set<() => void>();

function subscribe(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  const onStorage = (event: StorageEvent) => {
    if (event.key === THEME_STORAGE_KEY) onStoreChange();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onStoreChange);
    window.removeEventListener("storage", onStorage);
  };
}

function emit() {
  for (const listener of listeners) listener();
}

/** Reactive light/dark preference. SSR-safe: the server snapshot is light. */
export function useTheme(): ThemePreference {
  return useSyncExternalStore(subscribe, readThemePreference, () => "light");
}

/** Applies a theme and notifies every subscriber in this tab. */
export function setTheme(theme: ThemePreference) {
  applyTheme(theme);
  emit();
}
