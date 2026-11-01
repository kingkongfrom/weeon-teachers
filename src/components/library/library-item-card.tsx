"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Archive,
  ArchiveRestore,
  ClipboardCheck,
  FileText,
  Folder,
  FolderInput,
  Loader2,
  MoreHorizontal,
  Share2,
  Trash2,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLiveT } from "@/lib/i18n/client";
import type { LibraryCollection, LibraryItem } from "@/lib/assessments/library";

/**
 * One saved assessment.
 *
 * Deliberate choices:
 * - The kind reads twice: a **coloured spine** at the top edge (kind across the
 *   grid at a glance) and a compact kind pill beside the title row, so the eye
 *   can classify a card before reading a word of it.
 * - Meta is two fixed lines — `12 preguntas · 40 puntos` then
 *   `Matemática · 8°` — so cards compare vertically instead of wrapping
 *   unpredictably; usage sits in the footer as the card's only status.
 * - Actions hide until hover/focus on desktop and are always visible on touch,
 *   where hover does not exist. The title's stretched link makes the whole card
 *   clickable while keeping one tab stop and the real accessible name; the
 *   menu and its dropdown sit above that layer.
 */
export function LibraryItemCard({
  item,
  collections,
  busy,
  onDuplicate,
  onArchive,
  onDelete,
  onShare,
  onMove,
}: {
  item: LibraryItem;
  collections: LibraryCollection[];
  busy: boolean;
  onDuplicate: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onShare: () => void;
  onMove: (collectionId: string | null) => void;
}) {
  const t = useLiveT();
  const l = t.library;
  const [menuOpen, setMenuOpen] = useState(false);

  const isExam = item.kind === "exam";
  const KindIcon = isExam ? ClipboardCheck : FileText;
  const href = `/aula-virtual/mis-evaluaciones/${item.id}`;

  const subjectLevel = [item.subjectName, item.gradeLevel].filter(Boolean).join(" · ");

  return (
    <article
      className={cn(
        "group/card relative flex h-full flex-col overflow-hidden rounded-xl border border-border bg-surface",
        "transition-[border-color,background-color] duration-200",
        "hover:border-border-strong hover:bg-surface-muted/40",
        "has-[:focus-visible]:border-[#0891B2]/60 has-[:focus-visible]:ring-1 has-[:focus-visible]:ring-[#0891B2]/30",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "absolute inset-x-0 top-0 h-[3px]",
          isExam
            ? "bg-gradient-to-r from-[#7c3aed] to-[#a78bfa]"
            : "bg-gradient-to-r from-[#0d9488] to-[#5eead4]",
        )}
      />

      <div className="flex flex-1 flex-col gap-2.5 p-3 pt-3.5">
        <div className="flex items-start justify-between gap-2">
          <span
            className={cn(
              "inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-[2px] text-[9.5px] font-bold uppercase tracking-[0.08em]",
              isExam
                ? "bg-[#ede9fe] text-[#5b21b6] dark:bg-[#2a1f4a] dark:text-[#c4b5fd]"
                : "bg-[#ccfbf1] text-[#115e59] dark:bg-[#0f2f2c] dark:text-[#5eead4]",
            )}
          >
            <KindIcon className="h-2.5 w-2.5" strokeWidth={2.4} />
            {isExam ? l.kindExam : l.kindHomework}
          </span>

          <div className="flex min-w-0 items-center gap-1">
            {busy ? (
              <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-foreground/40" />
            ) : item.shared ? (
              <span
                title={item.sharedByName ? l.sharedBy(item.sharedByName) : l.tabs.shared}
                className="inline-flex min-w-0 items-center gap-1 rounded-md bg-surface-muted px-1.5 py-0.5 text-[10px] font-semibold text-foreground/55"
              >
                <Users className="h-3 w-3 shrink-0" />
                <span className="max-w-[6.5rem] truncate">
                  {item.sharedByName || l.tabs.shared}
                </span>
              </span>
            ) : (
              <CardMenu
                open={menuOpen}
                setOpen={setMenuOpen}
                item={item}
                collections={collections}
                onArchive={onArchive}
                onDelete={onDelete}
                onShare={onShare}
                onMove={onMove}
              />
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          <Link
            href={href}
            className="line-clamp-2 text-[13.5px] font-semibold leading-snug text-foreground decoration-foreground/25 underline-offset-2 outline-none after:absolute after:inset-0 after:z-0 focus-visible:underline group-hover/card:underline"
          >
            {item.title || "—"}
          </Link>

          <div className="flex flex-col gap-0.5 text-[11.5px] font-medium tabular-nums text-foreground/45">
            <p className="truncate">
              {l.questions(item.questionCount)}
              <span className="mx-1 text-foreground/25">·</span>
              {l.points(item.pointsTotal)}
            </p>
            {subjectLevel ? <p className="truncate">{subjectLevel}</p> : null}
          </div>
        </div>

        <div className="relative z-10 mt-auto flex items-center justify-between gap-2 border-t border-border/70 pt-2">
          {item.shared ? (
            <span className="truncate text-[10.5px] font-semibold text-foreground/45">
              {l.tabs.shared}
            </span>
          ) : (
            <span
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 truncate text-[10.5px] font-semibold",
                item.usedCount > 0 ? "text-foreground/50" : "text-foreground/30",
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "h-1.5 w-1.5 shrink-0 rounded-full",
                  item.usedCount > 0 ? "bg-[#0d9488]" : "bg-foreground/20",
                )}
              />
              {item.usedCount > 0 ? l.usedIn(item.usedCount) : l.notUsedYet}
            </span>
          )}

          {item.shared ? (
            <button
              type="button"
              onClick={onDuplicate}
              disabled={busy}
              className="inline-flex h-6 shrink-0 items-center gap-1 rounded-full border border-border px-2 text-[11px] font-bold text-foreground/70 transition-colors hover:border-[#0891B2]/40 hover:bg-[#0891B2]/5 hover:text-[#0e7490] disabled:opacity-50 dark:hover:text-[#22d3ee]"
            >
              <FolderInput className="h-3 w-3" />
              {l.duplicate}
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function CardMenu({
  open,
  setOpen,
  item,
  collections,
  onArchive,
  onDelete,
  onShare,
  onMove,
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
  item: LibraryItem;
  collections: LibraryCollection[];
  onArchive: () => void;
  onDelete: () => void;
  onShare: () => void;
  onMove: (collectionId: string | null) => void;
}) {
  const t = useLiveT();
  const l = t.library;

  const act = (fn: () => void) => () => {
    setOpen(false);
    fn();
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-label={l.moreActions}
        aria-expanded={open}
        className={cn(
          "relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-foreground/35 transition-all hover:bg-surface-muted hover:text-foreground",
          !open && "sm:opacity-0 sm:group-hover/card:opacity-100 sm:focus-visible:opacity-100",
        )}
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open ? (
        <>
          <button
            type="button"
            aria-hidden
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-30 cursor-default"
          />
          <div className="absolute right-2 top-10 z-40 w-60 rounded-xl border border-border bg-surface-elevated p-1">
            <button type="button" onClick={act(onShare)} className="menu-row">
              <Share2 className="h-4 w-4 shrink-0" />
              {l.share}
            </button>

            <div className="my-1 h-px bg-border" />
            <p className="px-2 pb-1 pt-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-foreground/35">
              {l.moveToCollection}
            </p>
            <div className="max-h-40 overflow-y-auto">
              {collections.map((collection) => (
                <button
                  key={collection.id}
                  type="button"
                  onClick={act(() => onMove(collection.id))}
                  disabled={item.collectionId === collection.id}
                  className="menu-row disabled:opacity-40"
                >
                  <Folder className="h-4 w-4 shrink-0" />
                  <span className="truncate">{collection.name}</span>
                </button>
              ))}
              <button
                type="button"
                onClick={act(() => onMove(null))}
                disabled={item.collectionId == null}
                className="menu-row disabled:opacity-40"
              >
                <Folder className="h-4 w-4 shrink-0" />
                {l.noCollection}
              </button>
            </div>

            <div className="my-1 h-px bg-border" />
            <button type="button" onClick={act(onArchive)} className="menu-row">
              {item.archived ? (
                <ArchiveRestore className="h-4 w-4 shrink-0" />
              ) : (
                <Archive className="h-4 w-4 shrink-0" />
              )}
              {item.archived ? l.unarchive : l.archive}
            </button>
            <button
              type="button"
              onClick={act(onDelete)}
              className="menu-row text-error hover:bg-error/5"
            >
              <Trash2 className="h-4 w-4 shrink-0" />
              {l.delete}
            </button>
          </div>
        </>
      ) : null}
    </>
  );
}
