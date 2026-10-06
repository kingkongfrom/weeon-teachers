"use client";

import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Loader2, QrCode, RefreshCw, X } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import type { CalendarFeedLinks } from "@/lib/teachers/calendar-feed-actions";
import { rotateCalendarFeedLinks } from "@/lib/teachers/calendar-feed-actions";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/client";

type SubscribePlatform = "android" | "apple";

const DEFAULT_PLATFORM: SubscribePlatform = "apple";

/** Compact toolbar control + QR-first dialog (Agenda → Calendario). */
export function InstitutionCalendarSubscribe({ initialLinks }: { initialLinks: CalendarFeedLinks }) {
  const t = useT();
  const sub = t.agenda.calendario.subscribe;
  const [open, setOpen] = useState(false);
  const [platform, setPlatform] = useState<SubscribePlatform>(DEFAULT_PLATFORM);
  const [links, setLinks] = useState(initialLinks);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<"google" | "webcal" | null>(null);

  useEffect(() => {
    if (!open) {
      setPlatform(DEFAULT_PLATFORM);
      return;
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const copy = useCallback(async (kind: "google" | "webcal") => {
    const value = kind === "google" ? links.https : links.webcal;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
      window.setTimeout(() => setCopied(null), 2000);
    } catch {
      /* ignore */
    }
  }, [links]);

  async function onRotate() {
    if (busy) return;
    setBusy(true);
    const res = await rotateCalendarFeedLinks();
    setBusy(false);
    if (res.ok) setLinks(res.links);
  }

  const qrValue = platform === "android" ? links.https : links.webcal;
  const qrHint = platform === "android" ? sub.qrHintAndroid : sub.qrHintApple;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "inline-flex h-8 items-center gap-1.5 rounded-lg border border-brand-200/80 bg-brand-50/60 px-2.5",
          "text-xs font-semibold text-brand-800 transition-colors hover:bg-brand-100/80",
          "dark:border-brand-800/50 dark:bg-brand-950/40 dark:text-brand-200 dark:hover:bg-brand-950/60",
        )}
      >
        <QrCode className="h-3.5 w-3.5 text-brand-600 dark:text-brand-400" aria-hidden />
        <span className="hidden sm:inline">{sub.toolbar}</span>
      </button>

      {typeof document !== "undefined"
        ? createPortal(
            <AnimatePresence>
              {open ? (
                <div
                  key="calendar-subscribe"
                  className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center"
                >
                  <motion.button
                    type="button"
                    aria-label={t.common.close}
                    onClick={() => setOpen(false)}
                    className="absolute inset-0 cursor-default bg-black/40"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  />
                  <motion.div
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="calendar-subscribe-title"
                    className="relative z-10 w-full max-w-md rounded-t-3xl bg-surface shadow-2xl sm:rounded-3xl"
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 24 }}
                    transition={{ type: "spring", stiffness: 380, damping: 34 }}
                  >
                    <div className="p-5 sm:p-6">
                      <div className="mb-1 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h2 id="calendar-subscribe-title" className="text-lg font-bold text-foreground">
                            {sub.title}
                          </h2>
                          <p className="mt-1 text-sm font-medium text-foreground/55">{sub.dialogLead}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setOpen(false)}
                          aria-label={t.common.close}
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-foreground/60 transition-colors hover:bg-surface-muted hover:text-foreground"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>

                      <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-brand-700/70 dark:text-brand-300/80">
                        {sub.choosePlatform}
                      </p>
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <PlatformChip
                          active={platform === "apple"}
                          label={sub.platformApple}
                          tone="apple"
                          onClick={() => setPlatform("apple")}
                        />
                        <PlatformChip
                          active={platform === "android"}
                          label={sub.platformAndroid}
                          tone="android"
                          onClick={() => setPlatform("android")}
                        />
                      </div>

                      <div className="mt-5 flex flex-col items-center">
                        <div
                          className={cn(
                            "rounded-2xl p-[3px] shadow-lg",
                            platform === "apple"
                              ? "bg-gradient-to-br from-sky-400/80 via-brand-500/70 to-violet-500/80"
                              : "bg-gradient-to-br from-emerald-400/80 via-teal-500/70 to-brand-500/70",
                          )}
                        >
                          <div className="rounded-[13px] bg-white p-4 dark:bg-zinc-950">
                            <QRCodeSVG value={qrValue} size={220} level="M" includeMargin={false} />
                          </div>
                        </div>
                        <p className="mt-4 max-w-[20rem] text-center text-sm font-medium leading-snug text-foreground/75">
                          {qrHint}
                        </p>
                        <p className="mt-2 max-w-[20rem] text-center text-xs font-medium text-foreground/45">
                          {sub.scopeNote}
                        </p>
                      </div>

                      <details className="mt-6 rounded-xl border border-border/80 bg-gradient-to-br from-surface-muted/50 to-brand-50/30 px-3 py-2 dark:from-brand-950/20 dark:to-transparent">
                        <summary className="cursor-pointer list-none text-xs font-semibold text-foreground/60 [&::-webkit-details-marker]:hidden">
                          {sub.advanced}
                        </summary>
                        <div className="mt-3 flex flex-col gap-2 pb-1">
                          <CopyLinkButton
                            label={sub.copyGoogle}
                            copied={copied === "google"}
                            copiedLabel={sub.copied}
                            onClick={() => void copy("google")}
                          />
                          <CopyLinkButton
                            label={sub.copyWebcal}
                            copied={copied === "webcal"}
                            copiedLabel={sub.copied}
                            onClick={() => void copy("webcal")}
                          />
                          <button
                            type="button"
                            className="inline-flex items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-foreground/70 hover:bg-surface disabled:opacity-50"
                            disabled={busy}
                            onClick={() => void onRotate()}
                          >
                            {busy ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <RefreshCw className="h-3.5 w-3.5" />
                            )}
                            {sub.rotate}
                          </button>
                          <p className="text-[11px] font-medium leading-snug text-foreground/45">{sub.rotateHint}</p>
                        </div>
                      </details>
                    </div>
                  </motion.div>
                </div>
              ) : null}
            </AnimatePresence>,
            document.body,
          )
        : null}
    </>
  );
}

function PlatformChip({
  active,
  label,
  tone,
  onClick,
}: {
  active: boolean;
  label: string;
  tone: SubscribePlatform;
  onClick: () => void;
}) {
  const isApple = tone === "apple";
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-xl border px-3 py-2.5 text-sm font-semibold transition-all",
        active && isApple
          ? "border-sky-300/80 bg-sky-50 text-sky-900 shadow-sm ring-1 ring-sky-200/60 dark:border-sky-700/60 dark:bg-sky-950/50 dark:text-sky-100 dark:ring-sky-800/40"
          : active && !isApple
            ? "border-emerald-300/80 bg-emerald-50 text-emerald-900 shadow-sm ring-1 ring-emerald-200/60 dark:border-emerald-700/60 dark:bg-emerald-950/40 dark:text-emerald-100 dark:ring-emerald-800/40"
            : "border-border bg-surface text-foreground/50 hover:border-foreground/15 hover:bg-surface-muted hover:text-foreground/70",
      )}
    >
      {label}
    </button>
  );
}

function CopyLinkButton({
  label,
  copied,
  copiedLabel,
  onClick,
}: {
  label: string;
  copied: boolean;
  copiedLabel: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-surface px-3 py-2.5 text-xs font-semibold text-foreground/80 hover:bg-surface-muted"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : null}
      {copied ? copiedLabel : label}
    </button>
  );
}
