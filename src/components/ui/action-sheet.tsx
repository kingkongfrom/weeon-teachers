"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export type ActionSheetItem = {
  id: string;
  label: string;
  /** Second line. Shown on the phone sheet only, where there is room for it. */
  hint?: string;
  icon: ReactNode;
  onSelect: () => void;
  /** Renders the item separated from the ones above it. */
  separated?: boolean;
};

/**
 * A short list of actions that is a **dropdown on desktop** and a **bottom
 * sheet on a phone**.
 *
 * Desktop keeps the familiar anchored menu — a modal in the middle of a wide
 * screen is heavier than the action deserves, and it breaks the visual tie
 * between the button and what it opens.
 *
 * Phones get a sheet pinned to the bottom edge, matching Añadir material and
 * the rest of the app: rows are 52 px tall with a 20 px icon and a second line
 * of explanation, which is comfortable for a thumb and impossible in a
 * 176 px dropdown.
 *
 * Safari / Petal notes:
 * - `max-h-sheet` is the app's shared `vh` → `dvh` utility, so iOS Safari's URL
 *   bar cannot push the last row off-screen and older Huawei Browser
 *   (Chromium ≤ 102, no `dvh`) keeps the `vh` fallback instead of dropping the
 *   rule and having no cap at all.
 * - `pb-[env(safe-area-inset-bottom)]` clears the home indicator.
 * - The desktop menu is positioned from the trigger's measured rect, so it
 *   cannot be clipped by an ancestor's `overflow` the way an absolutely
 *   positioned child can.
 */
export function ActionSheet({
  open,
  onClose,
  title,
  items,
  triggerRef,
  align = "right",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  items: ActionSheetItem[];
  /** The button that opens it; the desktop menu hangs from its corner. */
  triggerRef?: React.RefObject<HTMLElement | null>;
  align?: "left" | "right";
}) {
  const [anchor, setAnchor] = useState<{ top: number; left: number; width: number } | null>(
    null,
  );
  /** Desktop only (`sm` and up); below that the sheet is pinned to the bottom. */
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      triggerRef?.current?.focus?.();
    };
  }, [open, onClose, triggerRef]);

  // Measure before paint so the desktop menu never flashes at the wrong place.
  useLayoutEffect(() => {
    if (!open) return;
    // Anchoring is a *desktop* behaviour. On a phone the panel is a sheet
    // pinned to the bottom edge, so applying a viewport-anchored `top` there
    // put it under the trigger instead (measured: top 72 instead of 844).
    const query = window.matchMedia("(min-width: 640px)");
    const measure = () => {
      setIsDesktop(query.matches);
      if (!query.matches) return;
      const rect = triggerRef?.current?.getBoundingClientRect();
      if (!rect) return;
      setAnchor({
        top: Math.round(rect.bottom + 8),
        left: Math.round(align === "right" ? rect.right : rect.left),
        width: Math.round(rect.width),
      });
    };
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [open, triggerRef, align]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <div
          className={cn(
            "fixed inset-0 z-[100]",
            // Phone: sheet at the bottom. Desktop: a bare layer the menu is
            // positioned inside. No layout classes on `sm` so nothing centres.
            "flex items-end justify-center",
          )}
        >
          <motion.button
            type="button"
            aria-label="Cerrar"
            onClick={onClose}
            className="absolute inset-0 cursor-default bg-[#10201d]/35 backdrop-blur-[1px] sm:bg-transparent sm:backdrop-blur-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          <motion.div
            role="menu"
            aria-label={title}
            style={
              isDesktop && anchor
                ? {
                    position: "absolute",
                    top: anchor.top,
                    // Right-aligned menus grow leftwards from the button.
                    ...(align === "right"
                      ? { right: `calc(100vw - ${anchor.left}px)` }
                      : { left: anchor.left }),
                  }
                : undefined
            }
            className={cn(
              "z-10 w-full max-h-sheet overflow-y-auto border border-border bg-surface-elevated",
              // Phone sheet chrome.
              "rounded-t-[1.5rem] pb-[env(safe-area-inset-bottom)]",
              "shadow-[0_-12px_40px_-12px_rgb(16_32_29/0.35)]",
              // Desktop: an anchored dropdown, not a full-width sheet.
              "sm:w-56 sm:max-w-[calc(100vw-1rem)] sm:rounded-xl sm:pb-1.5 sm:shadow-[0_16px_40px_-12px_rgb(16_32_29/0.28)]",
            )}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ type: "spring", stiffness: 380, damping: 34 }}
          >
            {/* Sheet handle + title. Hidden on desktop, where the button is the
                label and a header would just repeat it. */}
            <div className="flex items-center justify-between gap-2 px-4 pb-1 pt-3 sm:hidden">
              <span className="mx-auto h-1 w-10 rounded-full bg-foreground/15" aria-hidden />
            </div>
            <div className="flex items-center justify-between px-4 pb-2 pt-2 sm:hidden">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-foreground/40">
                {title}
              </p>
              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar"
                className="-mr-1.5 flex h-8 w-8 items-center justify-center rounded-full text-foreground/35 active:bg-surface-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <ul className="px-2 pb-2 sm:p-1.5">
              {items.map((item) => (
                <li key={item.id}>
                  {item.separated ? <div className="my-1 h-px bg-border" /> : null}
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      onClose();
                      item.onSelect();
                    }}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors",
                      "hover:bg-surface-muted active:bg-surface-muted",
                      "sm:gap-2 sm:rounded-lg sm:px-2.5 sm:py-1.5",
                    )}
                  >
                    {/* Icon tile on the sheet; a bare glyph in the desktop menu. */}
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-muted text-foreground/60 sm:h-4 sm:w-4 sm:rounded-none sm:bg-transparent">
                      {item.icon}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[14.5px] font-semibold text-foreground sm:text-sm">
                        {item.label}
                      </span>
                      {item.hint ? (
                        <span className="mt-0.5 block text-[12px] leading-snug text-foreground/50 sm:hidden">
                          {item.hint}
                        </span>
                      ) : null}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
