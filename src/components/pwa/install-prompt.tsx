"use client";

import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/client";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISSED_KEY = "weeon:install-dismissed";
const DISMISS_DAYS = 30;

/**
 * "Install the app" banner.
 *
 * Two very different worlds hide behind one button:
 *
 * - **Chrome / Edge / Android** fire `beforeinstallprompt`, which we stash and
 *   replay on tap — a real one-tap install, no instructions needed.
 * - **iOS Safari** fires nothing and offers no API. Installing is Share →
 *   "Añadir a pantalla de inicio", so the only honest option is to say that.
 *
 * The banner stays out of the way: it never covers content, it is dismissible,
 * a dismissal is remembered for 30 days, and it hides itself when the app is
 * already running installed (`display-mode: standalone`).
 */
export function InstallPrompt() {
  const t = useT();
  const [deferred, setDeferred] = useState<InstallPromptEvent | null>(null);
  const [showIos, setShowIos] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Already installed? Then there is nothing to offer.
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as { standalone?: boolean }).standalone === true;
    if (standalone) return;

    try {
      const dismissedAt = Number(window.localStorage.getItem(DISMISSED_KEY) ?? 0);
      if (dismissedAt && Date.now() - dismissedAt < DISMISS_DAYS * 86_400_000) return;
    } catch {
      /* private mode: show it, losing the memory only */
    }

    function onBeforeInstall(event: Event) {
      event.preventDefault();
      setDeferred(event as InstallPromptEvent);
      setVisible(true);
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstall);

    // iOS: no event exists, so detect the platform and offer instructions.
    const ua = window.navigator.userAgent;
    const isIos = /iPad|iPhone|iPod/.test(ua) || (ua.includes("Mac") && "ontouchend" in document);
    const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
    if (isIos && isSafari) {
      setShowIos(true);
      setVisible(true);
    }

    function onInstalled() {
      setVisible(false);
      setDeferred(null);
    }
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!visible) return null;

  function dismiss() {
    setVisible(false);
    try {
      window.localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    if (choice.outcome === "accepted") setVisible(false);
    setDeferred(null);
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-[90] px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] print-hide">
      <div
        className={cn(
          "mx-auto flex max-w-lg items-start gap-3 rounded-2xl border border-border bg-surface-elevated p-3.5",
          "shadow-[0_16px_40px_-16px_rgb(16_32_29/0.35)]",
        )}
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-100 dark:bg-brand-950/40 dark:text-brand-300 dark:ring-brand-900">
          <Download className="h-4 w-4" strokeWidth={2.2} />
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-[13.5px] font-semibold leading-tight text-foreground">
            {t.install.title}
          </p>
          {showIos && !deferred ? (
            <p className="mt-1 text-[12px] leading-snug text-foreground/55">
              {t.install.iosBefore}{" "}
              <Share className="inline h-3.5 w-3.5 -translate-y-px align-middle" />
              {" "}
              {t.install.iosAfter}
            </p>
          ) : (
            <p className="mt-1 text-[12px] leading-snug text-foreground/55">
              {t.install.body}
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {deferred ? (
            <button
              type="button"
              onClick={() => void install()}
              className="h-8 rounded-full bg-[#0891B2] px-3 text-[12.5px] font-semibold text-white transition-colors hover:bg-[#0e7490]"
            >
              {t.install.action}
            </button>
          ) : null}
          <button
            type="button"
            onClick={dismiss}
            aria-label={t.common.close}
            className="flex h-8 w-8 items-center justify-center rounded-full text-foreground/35 hover:bg-surface-muted hover:text-foreground/70"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
