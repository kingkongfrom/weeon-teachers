export const THEME_STORAGE_KEY = "weeon.theme";

export type ThemePreference = "light" | "dark";

export function readThemePreference(): ThemePreference {
  if (typeof window === "undefined") return "light";
  return window.localStorage.getItem(THEME_STORAGE_KEY) === "dark" ? "dark" : "light";
}

export function applyTheme(theme: ThemePreference) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
  window.localStorage.setItem(THEME_STORAGE_KEY, theme);
}

export function toggleTheme(): ThemePreference {
  const next = readThemePreference() === "dark" ? "light" : "dark";
  applyTheme(next);
  return next;
}

/** Inline bootstrap — keep in sync with THEME_STORAGE_KEY. */
export const THEME_BOOTSTRAP_SCRIPT = `(function(){try{var d=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)})==="dark";document.documentElement.classList.toggle("dark",d);document.documentElement.style.colorScheme=d?"dark":"light";}catch(e){}})();`;
