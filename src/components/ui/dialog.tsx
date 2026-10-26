"use client";

import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * App-styled modal — bottom sheet on mobile, centered card on desktop. Portaled
 * to <body>, Escape/backdrop close.
 *
 * Anatomy is fixed so every dialog in the app reads the same:
 *   header (optional icon + title + subtitle + close) ─ hairline ─ body ─ hairline ─ footer
 *
 * `icon` and `description` are what make a dialog feel considered rather than
 * generic; a bare title in a heavy bar reads like a browser alert.
 */
export function Dialog({
  open,
  title,
  description,
  icon,
  onClose,
  children,
  footer,
  panelClassName,
  bodyClassName,
}: {
  open: boolean;
  title: string;
  /** One line under the title explaining the consequence of the action. */
  description?: string;
  /** Small tinted glyph in the header. */
  icon?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  panelClassName?: string;
  bodyClassName?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-6">
          <motion.button            type="button"
            aria-label="Cerrar"
            onClick={onClose}
            className="absolute inset-0 bg-[#10201d]/45 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className={cn(
              // `dvh` not `vh`: on iOS Safari the URL bar makes 100vh taller
              // than the visible area, which cut the footer off. The bottom pad
              // clears the home indicator on a sheet that reaches the edge.
              "relative z-10 flex max-h-[90dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-[1.75rem] bg-surface pb-[env(safe-area-inset-bottom)] shadow-[0_32px_80px_-24px_rgb(16_32_29/0.38),0_4px_12px_-4px_rgb(16_32_29/0.12)] sm:rounded-[1.75rem] sm:pb-0",
              panelClassName,
            )}
            initial={{ opacity: 0, y: 24, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.99 }}
            transition={{ type: "spring", stiffness: 380, damping: 34 }}
          >
            <div
              className={cn(
                "flex items-start gap-3.5 px-5 pb-4 pt-5 sm:px-6",
                (icon || description) && "sm:pb-5",
              )}
            >
              {icon ? (
                <span className="mt-px flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-100 dark:bg-brand-950/40 dark:text-brand-300 dark:ring-brand-900">
                  {icon}
                </span>
              ) : null}
              <div className="min-w-0 flex-1">
                <h3 className="brand-page-title text-[1.0625rem] leading-tight text-foreground">
                  {title}
                </h3>
                {description ? (
                  <p className="mt-1 text-[13px] leading-snug text-foreground/50">
                    {description}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar"
                className="-mr-1.5 -mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-foreground/35 transition-colors hover:bg-surface-muted hover:text-foreground/80"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div
              aria-hidden
              className="h-px w-full bg-gradient-to-r from-transparent via-border to-transparent"
            />

            <div
              className={cn(
                "min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6",
                bodyClassName,
              )}
            >
              {children}
            </div>

            {footer ? (
              <>
                <div
                  aria-hidden
                  className="h-px w-full bg-gradient-to-r from-transparent via-border to-transparent"
                />
                <div className="flex flex-col-reverse gap-2 bg-background/50 px-5 py-4 sm:flex-row sm:items-center sm:justify-end sm:gap-2.5 sm:px-6">
                  {footer}
                </div>
              </>
            ) : null}
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}

/** Primary action inside a dialog footer. Full width on a phone sheet. */
export function DialogPrimary({
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        "inline-flex h-10 items-center justify-center gap-1.5 rounded-full px-5 text-sm font-semibold text-white transition-colors",
        "bg-[#0891B2] shadow-[inset_0_1px_0_rgb(255_255_255/0.22),0_1px_2px_rgb(8_145_178/0.35)]",
        "hover:bg-[#0e7490] active:scale-[0.98]",
        "disabled:pointer-events-none disabled:opacity-45",
        props.className,
      )}
    >
      {children}
    </button>
  );
}

/** Quiet action inside a dialog footer. */
export function DialogSecondary({
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        "inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-semibold text-foreground/60 transition-colors hover:bg-surface-muted hover:text-foreground",
        props.className,
      )}
    >
      {children}
    </button>
  );
}

/**
 * A labelled field for dialog forms: a small caps label over a bordered control
 * that highlights on focus-within, so the whole box reacts, not just the input.
 */
export function DialogField({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("flex flex-col gap-1.5", className)}>
      <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-foreground/40">
        {label}
      </span>
      {children}
      {hint ? <span className="text-[11px] text-foreground/45">{hint}</span> : null}
    </label>
  );
}

/** The bordered shell every dialog input/select sits in. */
export const DIALOG_CONTROL =
  "flex items-center rounded-xl border border-border bg-background transition-[border-color,box-shadow,background-color] duration-150 focus-within:border-[#0891B2] focus-within:bg-surface focus-within:shadow-[0_0_0_3px_rgb(8_145_178/0.14)]";
