"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Camera, Check, Globe, Loader2, LogOut, Moon, X } from "lucide-react";
import { LogoMark } from "@/components/brand/logo";
import { ProfileAvatarDisplay } from "@/components/layout/profile-avatar-display";
import { Switch } from "@/components/ui/switch";
import { useTheme, setTheme } from "@/lib/theme/theme-store";
import { LOCALES } from "@/lib/i18n/config";
import { useLocale, useSetLocale, useT } from "@/lib/i18n/client";
import { signOutTeacher } from "@/lib/auth/actions";
import type { AppUser } from "@/components/layout/app-shell";
import type { RealtimeConfig } from "@/lib/supabase/browser";
import { prepareProfileAvatarFromFile } from "@/lib/profile/profile-avatar-image";
import {
  profileAvatarErrorKey,
  signProfileAvatarUrl,
  uploadProfileAvatarClient,
} from "@/lib/profile/profile-avatar-client";

/**
 * Mobile-style settings drawer. Tapping the header avatar slides a full-height
 * panel in from the right (backdrop, Escape, body-scroll lock) with the teacher,
 * the institution, language, dark mode, and sign out.
 */
export function SettingsDrawer({
  user,
  supabasePublic,
}: {
  user: AppUser | null;
  supabasePublic: RealtimeConfig;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [photoNotice, setPhotoNotice] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const locale = useLocale();
  const setLocale = useSetLocale();
  const t = useT();
  const theme = useTheme();
  const isDark = theme === "dark";

  useEffect(() => {
    if (!user?.avatarStoragePath) {
      setAvatarUrl(null);
      return;
    }

    let cancelled = false;
    void signProfileAvatarUrl(supabasePublic, user.avatarStoragePath).then((url) => {
      if (!cancelled) setAvatarUrl(url);
    });

    return () => {
      cancelled = true;
    };
  }, [user?.avatarStoragePath, supabasePublic]);

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

  const { tenantId, userId } = user;
  const roleLabel = user.role === "admin" ? t.drawer.roleAdmin : t.drawer.roleTeacher;
  const localeLabel =
    LOCALES.find((option) => option.value === locale)?.label ?? "Español";

  function chooseLocale(next: typeof locale) {
    setLocale(next);
    setLangOpen(false);
  }

  async function onPhotoSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || uploading) return;

    setPhotoNotice(null);
    setUploading(true);
    try {
      const prepared = await prepareProfileAvatarFromFile(file);
      const result = await uploadProfileAvatarClient(
        supabasePublic,
        tenantId,
        userId,
        prepared,
      );
      if (!result.ok) {
        const key = profileAvatarErrorKey(result.error);
        setPhotoNotice(t.drawer[key]);
        return;
      }
      const url = await signProfileAvatarUrl(supabasePublic, result.storagePath);
      setAvatarUrl(url);
      setPhotoNotice(t.drawer.profilePhotoUpdated);
      router.refresh();
    } catch {
      setPhotoNotice(t.drawer.profilePhotoError);
    } finally {
      setUploading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="outline-none ring-offset-2 ring-offset-surface transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={t.drawer.ariaAccount}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <ProfileAvatarDisplay name={user.name} imageUrl={avatarUrl} size="sm" />
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(event) => void onPhotoSelected(event)}
      />

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
                      <div className="flex flex-col items-center gap-4 text-center">
                        <button
                          type="button"
                          disabled={uploading}
                          onClick={() => fileInputRef.current?.click()}
                          className="relative outline-none ring-offset-2 ring-offset-surface transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
                          aria-label={t.drawer.profilePhoto}
                        >
                          <ProfileAvatarDisplay
                            name={user.name}
                            imageUrl={avatarUrl}
                            size="lg"
                          />
                          {uploading ? (
                            <span className="absolute inset-0 flex items-center justify-center rounded-[1.35rem] bg-black/35">
                              <Loader2 className="h-7 w-7 animate-spin text-white" />
                            </span>
                          ) : null}
                        </button>

                        <div className="min-w-0">
                          <p className="truncate text-lg font-bold text-foreground">
                            {user.name}
                          </p>
                          <span className="mt-1 inline-flex rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-700 dark:bg-brand-950/40 dark:text-brand-300">
                            {roleLabel}
                          </span>
                        </div>
                      </div>

                      {photoNotice ? (
                        <p className="mt-4 text-center text-sm font-medium text-foreground/70">
                          {photoNotice}
                        </p>
                      ) : null}

                      <div className="mt-5 flex items-center gap-3 rounded-2xl bg-surface-muted px-4 py-3">
                        <LogoMark className="h-8 w-8 shrink-0" />
                        <p className="truncate text-sm font-semibold text-foreground">
                          {user.tenantName ?? t.common.fallbackSchool}
                        </p>
                      </div>

                      <button
                        type="button"
                        disabled={uploading}
                        onClick={() => fileInputRef.current?.click()}
                        className="mt-4 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-foreground transition-colors hover:bg-surface-muted disabled:opacity-60"
                      >
                        <Camera className="h-5 w-5 text-foreground/70" />
                        <span className="flex-1 text-left">{t.drawer.profilePhoto}</span>
                      </button>

                      <div className="mt-3 flex items-center justify-between gap-4">
                        <span className="flex items-center gap-3 text-sm font-medium text-foreground">
                          <Moon className="h-5 w-5 text-foreground/70" />
                          {t.drawer.darkMode}
                        </span>
                        <Switch
                          checked={isDark}
                          onChange={(checked) => setTheme(checked ? "dark" : "light")}
                          label={t.drawer.darkMode}
                        />
                      </div>

                      <div className="mt-2 border-t border-border pt-2">
                        <button
                          type="button"
                          onClick={() => setLangOpen((value) => !value)}
                          aria-expanded={langOpen}
                          className="flex w-full items-center justify-between gap-4 rounded-lg px-3 py-3 text-sm font-medium text-foreground transition-colors hover:bg-surface-muted"
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
                          className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-red-700"
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
