"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { ChevronRight, Globe, Loader2, Lock, LogOut, Moon, X } from "lucide-react";
import { LogoMark } from "@/components/brand/logo";
import { useCenteredLogo } from "@/lib/dashboard/use-centered-logo";
import { ProfileAvatarDisplay } from "@/components/layout/profile-avatar-display";
import { Switch } from "@/components/ui/switch";
import { useTheme, setTheme } from "@/lib/theme/theme-store";
import type { Locale } from "@/lib/i18n/config";
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
  const logoSrc = useCenteredLogo(user?.logoUrl);

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
  const loginHandle = user.username?.trim() ?? "";
  const showLoginHandle =
    loginHandle.length > 0 &&
    loginHandle.localeCompare(user.name, undefined, { sensitivity: "accent" }) !== 0;
  const languageOptions: { value: Locale; label: string }[] = [
    { value: "es", label: t.drawer.languageSpanish },
    { value: "en", label: t.drawer.languageEnglish },
  ];

  function chooseLocale(next: Locale) {
    setLocale(next);
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
        className="flex max-w-[14rem] items-center gap-5 rounded-xl py-0.5 pl-0.5 pr-1 outline-none ring-offset-2 ring-offset-surface transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring sm:max-w-xs sm:pr-2"
        aria-label={t.drawer.ariaAccount}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span className="min-w-0 flex-1 text-right">
          <span className="block truncate text-sm font-semibold leading-tight text-foreground">
            {user.name}
          </span>
          <span className="mt-0.5 block truncate text-xs leading-tight text-foreground/55">
            {user.tenantName ?? t.common.fallbackSchool}
          </span>
        </span>
        <ProfileAvatarDisplay name={user.name} imageUrl={avatarUrl} size="header" />
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
                    <div className="flex items-center px-2 py-2">
                      <span className="h-11 w-11 shrink-0" aria-hidden />
                      <p className="flex-1 text-center text-sm font-semibold text-foreground/55">
                        {t.drawer.title}
                      </p>
                      <button
                        ref={closeRef}
                        type="button"
                        onClick={() => setOpen(false)}
                        className="flex h-11 w-11 items-center justify-center rounded-full text-foreground/55 outline-none transition-colors hover:bg-surface-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                        aria-label={t.common.close}
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>

                    <div className="flex-1 overflow-y-auto px-5 pb-4">
                      <div className="flex items-start gap-4 py-2">
                        <button
                          type="button"
                          disabled={uploading}
                          onClick={() => fileInputRef.current?.click()}
                          className="relative shrink-0 outline-none ring-offset-2 ring-offset-surface transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
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

                        <div className="min-w-0 flex-1 pt-1">
                          <p className="line-clamp-2 text-base font-semibold leading-snug text-foreground">
                            {user.name}
                          </p>
                          <span className="mt-1.5 inline-flex rounded-full border border-[#2b59ff]/45 bg-[#2b59ff]/15 px-2.5 py-0.5 text-sm font-semibold text-[#1d4ed8] dark:text-white">
                            {t.drawer.teacherAccess}
                          </span>
                          <p className="mt-1.5 text-xs font-semibold text-foreground/55">{roleLabel}</p>
                          {showLoginHandle ? (
                            <p className="mt-0.5 truncate text-xs font-semibold text-foreground/40">
                              {loginHandle}
                            </p>
                          ) : null}
                        </div>
                      </div>

                      {photoNotice ? (
                        <p className="mt-2 text-sm font-medium text-foreground/70">{photoNotice}</p>
                      ) : null}

                      <div className="mt-3 flex items-center gap-3 rounded-2xl bg-surface-muted px-4 py-3">
                        {logoSrc ? (
                          <span className="h-12 w-12 shrink-0 overflow-hidden rounded-full">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={logoSrc}
                              alt={user.tenantName ?? t.common.fallbackSchool}
                              className="h-full w-full origin-center scale-[1.14] object-cover"
                            />
                          </span>
                        ) : (
                          <LogoMark className="h-8 w-8 shrink-0" />
                        )}
                        <p className="truncate text-sm font-semibold text-foreground">
                          {user.tenantName ?? t.common.fallbackSchool}
                        </p>
                      </div>

                      <div className="mt-2 space-y-1 border-t border-border pt-4">
                        <Link
                          href="/forgot-password"
                          onClick={() => setOpen(false)}
                          className="flex min-h-12 items-center gap-3 rounded-lg py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface-muted"
                        >
                          <Lock className="h-5 w-5 shrink-0 text-foreground/55" />
                          <span className="flex-1">{t.drawer.changePassword}</span>
                          <ChevronRight className="h-4 w-4 shrink-0 text-foreground/40" />
                        </Link>

                        <div className="flex min-h-12 items-center gap-3 py-2">
                          <Globe className="h-5 w-5 shrink-0 text-foreground/55" />
                          <span className="flex-1 text-sm font-medium text-foreground">
                            {t.drawer.language}
                          </span>
                          <span className="flex shrink-0 items-center gap-1">
                            {languageOptions.map((option) => {
                              const selected = locale === option.value;
                              return (
                                <button
                                  key={option.value}
                                  type="button"
                                  aria-pressed={selected}
                                  onClick={() => chooseLocale(option.value)}
                                  className={
                                    selected
                                      ? "rounded-full border border-[#2b59ff] bg-[#2b59ff]/15 px-2.5 py-1 text-xs font-bold text-[#2b59ff]"
                                      : "rounded-full border border-border px-2.5 py-1 text-xs font-bold text-foreground/80"
                                  }
                                >
                                  {option.label}
                                </button>
                              );
                            })}
                          </span>
                        </div>

                        <div className="flex min-h-12 items-center gap-3 py-2">
                          <Moon className="h-4 w-4 shrink-0 text-foreground/55" />
                          <span className="flex-1 text-[13px] font-normal text-foreground">
                            {t.drawer.darkMode}
                          </span>
                          <Switch
                            checked={isDark}
                            onChange={(checked) => setTheme(checked ? "dark" : "light")}
                            label={t.drawer.darkMode}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="px-5 pb-5 pt-2">
                      <p className="text-center text-xs font-medium text-foreground/45">
                        {t.drawer.version("0.1.0")}
                      </p>
                      <p className="mb-2 mt-1 text-center text-xs font-medium text-foreground/45">
                        {t.drawer.signOutHint}
                      </p>
                      <form action={signOutTeacher}>
                        <button
                          type="submit"
                          className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-red-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-red-700"
                        >
                          <LogOut className="h-5 w-5" />
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
