"use client";

import { useEffect, useState } from "react";
import { Download, MoreVertical, Share, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLiveT } from "@/lib/i18n/client";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISSED_KEY = "weeon:install-dismissed";
/** Remembered dismissals; also the cookie fallback for Safari private mode. */
const DISMISS_DAYS = 90;

function readDismissedAt(): number {
  try {
    const stored = Number(window.localStorage.getItem(DISMISSED_KEY) ?? 0);
    if (stored) return stored;
  } catch {
    /* private mode: fall through to the cookie */
  }
  // iOS Safari in private mode throws on localStorage writes; a cookie still
  // survives the session, which is what stops the banner nagging on every visit.
  const match = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(`${DISMISSED_KEY}=`));
  return Number(match?.slice(DISMISSED_KEY.length + 1) ?? 0) || 0;
}

function writeDismissedAt(at: number): void {
  try {
    window.localStorage.setItem(DISMISSED_KEY, String(at));
  } catch {
    /* ignore */
  }
  // 400 days is the browser cap for cookie lifetime.
  document.cookie = `${DISMISSED_KEY}=${at}; path=/; max-age=${Math.floor(
    DISMISS_DAYS * 86_400,
  )}; samesite=lax`;
}

/**
 * Where can this browser be offered an install at all?
 *
 *  - `none`      — already installed, dismissed recently, or local dev.
 *  - `event`     — Chrome/Edge/Android: wait for `beforeinstallprompt`.
 *  - `ios`       — iOS Safari: no API, so written Share instructions.
 *  - `huawei`    — Petal Browser: AppGallery path, menu instructions.
 *
 * Computed once before render so the banner never flashes in and out, and never
 * comes back on every visit after being dismissed.
 */
function detectSurface(): "none" | "event" | "ios" | "huawei" {
  if (typeof window === "undefined") return "none";

  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as { standalone?: boolean }).standalone === true;
  if (standalone) return "none";

  const dismissedAt = readDismissedAt();
  if (dismissedAt && Date.now() - dismissedAt < DISMISS_DAYS * 86_400_000) return "none";

  const ua = window.navigator.userAgent;
  const isIos = /iPad|iPhone|iPod/.test(ua) || (ua.includes("Mac") && "ontouchend" in document);
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
  const isHuawei = /HuaweiBrowser\//.test(ua);

  // Those two browsers can never report "installed", so a banner there would be
  // permanent. Only offer it off localhost, from the second visit onward — a
  // developer reloading the preview should never see it.
  const devHost = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(window.location.hostname);
  if (!devHost) {
    const seenKey = "weeon:install-seen";
    let visits = 0;
    try {
      visits = Number(window.localStorage.getItem(seenKey) ?? 0) + 1;
      window.localStorage.setItem(seenKey, String(visits));
    } catch {
      /* private mode: treat as a first visit */
    }
    if (visits >= 2) {
      if (isIos && isSafari) return "ios";
      if (isHuawei) return "huawei";
    }
  }

  return "event";
}

/**
 * "Install the app" banner.
 *
 * Two very different worlds hide behind one button:
 *
 * - **Chrome / Edge / Android** fire `beforeinstallprompt`, which we stash and
 *   replay on tap — a real one-tap install, no instructions needed.
 * - **iOS Safari** fires nothing and offers no API. Installing is Share →
 *   "Añadir a pantalla de inicio", so the only honest option is to say that.
 * - **Huawei (Petal) Browser** is Chromium-based but, like iOS, usually never
 *   fires `beforeinstallprompt` (Huawei pushes AppGallery installs instead), so
 *   it gets the same kind of written instructions — browser menu → install.
 *
 * The banner stays out of the way: it never covers content, it is dismissible,
 * a dismissal is remembered for 90 days (cookie fallback so Safari private mode
 * keeps it too), and it hides itself when the app is already running installed.
 */
export function InstallPrompt() {
  const t = useLiveT();
  const [surface] = useState(detectSurface);
  const [deferred, setDeferred] = useState<InstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [installed, setInstalled] = useState(false);

  const visible =
    !dismissed && !installed && surface !== "none" && (surface !== "event" || deferred !== null);

  useEffect(() => {
    if (surface !== "event") return;

    function onBeforeInstall(event: Event) {
      event.preventDefault();
      setDeferred(event as InstallPromptEvent);
    }
    function onInstalled() {
      setDismissed(true);
      setDeferred(null);
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, [surface]);

  if (!visible) return null;

  const showIos = surface === "ios";
  const showHuawei = surface === "huawei";

  function dismiss() {
    setDismissed(true);
    writeDismissedAt(Date.now());
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    if (choice.outcome === "accepted") setInstalled(true);
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
          ) : showHuawei && !deferred ? (
            <p className="mt-1 text-[12px] leading-snug text-foreground/55">
              {t.install.huaweiBefore} <MoreVertical className="inline h-3.5 w-3.5 -translate-y-px align-middle" />{" "}
              {t.install.huaweiAfter}
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
