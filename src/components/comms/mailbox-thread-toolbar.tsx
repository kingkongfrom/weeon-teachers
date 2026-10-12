"use client";

import { useEffect, useRef, useState, type ReactElement } from "react";
import Link from "next/link";
import {
  ExternalLink,
  Loader2,
  Printer,
  Reply,
  RotateCcw,
  Star,
  Trash2,
} from "lucide-react";
import { Tooltip } from "@/components/ui/tooltip";
import { COMMS_COMPOSE } from "@/lib/comms/paths";
import { cn } from "@/lib/utils";
import { messagesTone } from "@/lib/comms/messages-tone";
import { useT } from "@/lib/i18n/use-i18n";
import type { MessageFolder } from "@/lib/dashboard/messages";

export type MailboxThreadToolbarProps = {
  threadId: string;
  allowReplies: boolean;
  fullThreadHref: string;
  folder: MessageFolder;
  isFavorite: boolean;
  isMine: boolean;
  busy?: boolean;
  onToggleFavorite: () => void;
  onMoveToTrash: () => void;
  onRestore?: () => void;
  onDeletePermanently?: () => void;
};

const iconBtn =
  "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-transparent text-foreground/55 transition-colors hover:border-border hover:bg-surface-muted hover:text-foreground disabled:opacity-45";

function IconTooltip({ label, children }: { label: string; children: ReactElement }) {
  return (
    <Tooltip content={label} placement="bottom">
      {children}
    </Tooltip>
  );
}

export function MailboxThreadToolbar({
  threadId,
  allowReplies,
  fullThreadHref,
  folder,
  isFavorite,
  isMine,
  busy,
  onToggleFavorite,
  onMoveToTrash,
  onRestore,
  onDeletePermanently,
}: MailboxThreadToolbarProps) {
  const t = useT();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const inTrash = folder === "trash";
  const favoriteLabel = isFavorite ? t("comms.removedFromFavorites") : t("comms.addedToFavorites");

  useEffect(() => {
    if (!menuOpen) return;
    function onPointerDown(event: PointerEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  return (
    <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
      {busy ? (
        <span className="inline-flex h-10 w-10 items-center justify-center text-foreground/35">
          <Loader2 className="h-5 w-5 animate-spin" />
        </span>
      ) : null}

      {allowReplies && !inTrash ? (
        <IconTooltip label={t("comms.replySection")}>
          <Link
            href={`${COMMS_COMPOSE}?thread=${threadId}`}
            className={iconBtn}
            aria-label={t("comms.replySection")}
          >
            <Reply className="h-5 w-5" />
          </Link>
        </IconTooltip>
      ) : null}

      {!inTrash ? (
        <IconTooltip label={favoriteLabel}>
          <button
            type="button"
            className={cn(iconBtn, isFavorite && "text-amber-500 hover:text-amber-600")}
            aria-label={favoriteLabel}
            disabled={busy}
            onClick={onToggleFavorite}
          >
            <Star className="h-5 w-5" fill={isFavorite ? "currentColor" : "none"} />
          </button>
        </IconTooltip>
      ) : null}

      {inTrash ? (
        <>
          {onRestore ? (
            <IconTooltip label={t("comms.restoreMessage")}>
              <button
                type="button"
                className={iconBtn}
                disabled={busy}
                onClick={onRestore}
                aria-label={t("comms.restoreMessage")}
              >
                <RotateCcw className="h-5 w-5" />
              </button>
            </IconTooltip>
          ) : null}
          {isMine && onDeletePermanently ? (
            <IconTooltip label={t("comms.deletePermanently")}>
              <button
                type="button"
                className={cn(iconBtn, "hover:border-error/30 hover:bg-error/10 hover:text-error")}
                disabled={busy}
                onClick={onDeletePermanently}
                aria-label={t("comms.deletePermanently")}
              >
                <Trash2 className="h-5 w-5" />
              </button>
            </IconTooltip>
          ) : null}
        </>
      ) : (
        <IconTooltip label={t("comms.moveToTrash")}>
          <button
            type="button"
            className={cn(iconBtn, "hover:border-error/30 hover:bg-error/10 hover:text-error")}
            disabled={busy}
            onClick={onMoveToTrash}
            aria-label={t("comms.moveToTrash")}
          >
            <Trash2 className="h-5 w-5" />
          </button>
        </IconTooltip>
      )}

      <div ref={menuRef} className="relative">
        <IconTooltip label={t("common.moreActions")}>
          <button
            type="button"
            className={iconBtn}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label={t("common.moreActions")}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <KebabIcon />
          </button>
        </IconTooltip>
        {menuOpen ? (
          <div
            role="menu"
            className="absolute right-0 top-full z-50 mt-1.5 min-w-[12rem] overflow-hidden rounded-xl border border-border bg-surface p-1 shadow-lg"
          >
            <Link
              role="menuitem"
              href={fullThreadHref}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-foreground/80 hover:bg-surface-muted"
              onClick={() => setMenuOpen(false)}
            >
              <ExternalLink className="h-4 w-4 shrink-0" />
              {t("comms.openFullThread")}
            </Link>
            <button
              type="button"
              role="menuitem"
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-foreground/80 hover:bg-surface-muted"
              onClick={() => {
                setMenuOpen(false);
                window.print();
              }}
            >
              <Printer className="h-4 w-4 shrink-0" />
              {t("comms.printThread")}
            </button>
            {!inTrash ? (
              <button
                type="button"
                role="menuitem"
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-semibold hover:bg-surface-muted",
                  messagesTone.linkHover,
                )}
                onClick={() => {
                  setMenuOpen(false);
                  onMoveToTrash();
                }}
              >
                <Trash2 className="h-4 w-4 shrink-0" />
                {t("comms.moveToTrash")}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function KebabIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <circle cx="12" cy="5" r="2.5" />
      <circle cx="12" cy="12" r="2.5" />
      <circle cx="12" cy="19" r="2.5" />
    </svg>
  );
}
