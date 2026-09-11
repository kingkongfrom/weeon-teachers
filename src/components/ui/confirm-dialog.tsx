"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle, Loader2 } from "lucide-react";

/**
 * App-styled confirmation modal — replaces `window.confirm`. Portaled to
 * <body> and shown as a bottom sheet on mobile, centered card on desktop.
 * Escape / backdrop cancel unless a confirm is in flight.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  pending = false,
  destructive = true,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel: string;
  cancelLabel: string;
  pending?: boolean;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !pending) onCancel();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, pending, onCancel]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <div
          key="confirm-dialog"
          className="fixed inset-0 z-[110] flex items-end justify-center sm:items-center"
        >
          <motion.button
            type="button"
            aria-label={cancelLabel}
            onClick={() => {
              if (!pending) onCancel();
            }}
            className="absolute inset-0 cursor-default bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />

          <motion.div
            role="alertdialog"
            aria-modal="true"
            aria-label={title}
            className="relative z-10 w-full max-w-sm rounded-t-3xl bg-surface p-5 shadow-2xl sm:rounded-3xl"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ type: "spring", stiffness: 380, damping: 34 }}
          >
            <div className="flex items-start gap-3">
              {destructive ? (
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-error/10 text-error">
                  <AlertTriangle className="h-5 w-5" />
                </span>
              ) : null}
              <div className="min-w-0 pt-0.5">
                <h3 className="text-base font-bold text-foreground">{title}</h3>
                {description ? (
                  <p className="mt-1 break-words text-sm font-medium text-foreground/60">
                    {description}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={onCancel}
                disabled={pending}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-border px-4 text-sm font-semibold text-foreground/70 transition-colors hover:bg-surface-muted disabled:opacity-60"
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={pending}
                className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-error px-4 text-sm font-semibold text-white transition-all hover:brightness-95 disabled:opacity-60"
              >
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
