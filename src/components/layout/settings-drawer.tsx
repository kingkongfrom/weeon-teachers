"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { Check, Globe, LogOut, Moon, X } from "lucide-react";
import { LogoMark } from "@/components/brand/logo";
import { Switch } from "@/components/ui/switch";
import { useTheme, setTheme } from "@/lib/theme/theme-store";
import { LOCALES } from "@/lib/i18n/config";
import { useLocale, useSetLocale, useT } from "@/lib/i18n/client";
import { signOutTeacher } from "@/lib/auth/actions";
import type { AppUser } from "@/components/layout/app-shell";

/**
 * Mobile-style settings drawer. Tapping the header avatar slides a full-height
 * panel in from the right (backdrop, Escape, body-scroll lock) with the teacher,
 * the institution, language, dark mode, and sign out.
 *
 * The overlay is portaled to <body>: the header has `backdrop-blur`, which would
 * otherwise become the containing block for `position: fixed` and trap the panel.
 */
export function SettingsDrawer({ user }: { user: AppUser | null }) {
  const [open, setOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const locale = useLocale();
  const setLocale = useSetLocale();
  const t = useT();
  const theme = useTheme();
  const isDark = theme === "dark";
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  if (!user) return null;

  const initials = initialsOf(user.name);
  const roleLabel = user.role === "admin" ? t.drawer.roleAdmin : t.drawer.roleTeacher;
  const localeLabel =
    LOCALES.find((option) => option.value === locale)?.label ?? "Español";

  function chooseLocale(next: typeof locale) {
    setLocale(next);
    setLangOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="h-9 w-9 overflow-hidden rounded-xl brand-gradient outline-none ring-offset-2 ring-offset-surface transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={t.drawer.ariaAccount}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span className="flex h-full w-full items-center justify-center text-xs font-bold text-white">
          {initials}
        </span>
      </button>

      {typeof document !== "undefined"
        ? createPortal(
            <AnimatePresence>
              {open ? (
                <div key="settings-drawer" className="fixed inset-0 z-[100]">
                  <motion.button
                    type="button"
                    aria-label={t.drawer.ariaClose}
                    onClick={() => setOpen(false)}
                    className="absolute inset-0 cursor-default bg-black/40"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  />

                  <motion.aside
                    role="dialog"
                    aria-modal="true"
                    aria-label={t.drawer.ariaSettings}
                    className="absolute right-0 top-0 flex h-dvh w-full max-w-sm flex-col bg-surface shadow-2xl"
                    initial={{ x: "100%" }}
                    animate={{ x: 0 }}
                    exit={{ x: "100%" }}
                    transition={{ type: "spring", stiffness: 380, damping: 38 }}
                  >
                    <div className="flex items-center border-b border-border px-4 py-3">
                      <button
                        ref={closeRef}
                        type="button"
                        onClick={() => setOpen(false)}
                        className="flex h-9 w-9 items-center justify-center rounded-full text-foreground/70 outline-none transition-colors hover:bg-surface-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                        aria-label={t.common.close}
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>

                    <div className="flex-1 overflow-y-auto px-5 py-6">
                      <div className="flex items-center gap-4">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl brand-gradient text-lg font-bold text-white">
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-lg font-bold text-foreground">
                            {user.name}
                          </p>
                          <span className="mt-1 inline-flex rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-700 dark:bg-brand-950/40 dark:text-brand-300">
                            {roleLabel}
                          </span>
                        </div>
                      </div>

                      <div className="mt-5 flex items-center gap-3 rounded-2xl bg-surface-muted px-4 py-3">
                        <LogoMark className="h-8 w-8 shrink-0" />
                        <p className="truncate text-sm font-semibold text-foreground">
                          {user.tenantName ?? t.common.fallbackSchool}
                        </p>
                      </div>

                      <div className="mt-7 flex items-center justify-between gap-4">
                        <span className="flex items-center gap-3 text-sm font-medium text-foreground">
                          <Moon className="h-5 w-5 text-foreground/70" />
                          {t.drawer.darkMode}
                        </span>
                        <Switch
                          checked={isDark}
                          onChange={(checked) =>
                            setTheme(checked ? "dark" : "light")
                          }
                          label={t.drawer.darkMode}
                        />
                      </div>

                      <div className="mt-2 border-t border-border pt-2">
                        <button
                          type="button"
                          onClick={() => setLangOpen((value) => !value)}
                          aria-expanded={langOpen}
                          className="flex w-full items-center justify-between gap-4 rounded-lg px-1 py-3 text-sm font-medium text-foreground transition-colors hover:text-brand-700 dark:hover:text-brand-300"
                        >
                          <span className="flex items-center gap-3">
                            <Globe className="h-5 w-5 text-foreground/70" />
                            {t.drawer.language}
                          </span>
                          <span className="text-sm font-medium text-foreground/50">
                            {localeLabel}
                          </span>
                        </button>

                        <AnimatePresence initial={false}>
                          {langOpen ? (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              {LOCALES.map((option) => (
                                <button
                                  key={option.value}
                                  type="button"
                                  onClick={() => chooseLocale(option.value)}
                                  className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm font-medium text-foreground transition-colors hover:bg-surface-muted"
                                >
                                  {option.label}
                                  {locale === option.value ? (
                                    <Check className="h-4 w-4 text-brand-600 dark:text-brand-300" />
                                  ) : null}
                                </button>
                              ))}
                            </motion.div>
                          ) : null}
                        </AnimatePresence>
                      </div>
                    </div>

                    <div className="border-t border-border px-5 py-4">
                      <form action={signOutTeacher}>
                        <button
                          type="submit"
                          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#e7000b] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#c40009]"
                        >
                          <LogOut className="h-4 w-4" />
                          {t.drawer.logout}
                        </button>
                      </form>
                    </div>
                  </motion.aside>
                </div>
              ) : null}
            </AnimatePresence>,
            document.body,
          )
        : null}
    </>
  );
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.charAt(0) ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1].charAt(0) : "";
  return (first + last).toUpperCase() || "W";
}
