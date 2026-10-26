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
import { useT } from "@/lib/i18n/client";
import type { LibraryCollection, LibraryItem } from "@/lib/assessments/library";

/**
 * One saved assessment.
 *
 * Deliberate choices:
 * - The kind is a **coloured spine** at the top edge, not another pill: at a
 *   glance across a grid you read Examen vs Tarea without parsing text.
 * - Meta reads as `12 preguntas · 40 pts` on one line, subject/level on the
 *   next, usage last — a fixed order so cards compare vertically.
 * - Actions hide until hover/focus on desktop and are always visible on touch,
 *   where hover does not exist.
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
  const t = useT();
  const l = t.library;
  const [menuOpen, setMenuOpen] = useState(false);

  const isExam = item.kind === "exam";
  const KindIcon = isExam ? ClipboardCheck : FileText;

  return (
    <article className="group/card relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-surface transition-[border-color,box-shadow] duration-200 hover:border-border-strong hover:shadow-[0_8px_24px_-14px_rgb(16_32_29/0.28)]">
      <span
        aria-hidden
        className={cn(
          "h-[3px] w-full",
          isExam
            ? "bg-gradient-to-r from-[#7c3aed] to-[#a78bfa]"
            : "bg-gradient-to-r from-[#0d9488] to-[#5eead4]",
        )}
      />

      <div className="flex flex-1 flex-col gap-2.5 p-4">
        <div className="flex items-start justify-between gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em]",
              isExam
                ? "bg-[#ede9fe] text-[#5b21b6] dark:bg-[#2a1f4a] dark:text-[#c4b5fd]"
                : "bg-[#ccfbf1] text-[#115e59] dark:bg-[#0f2f2c] dark:text-[#5eead4]",
            )}
          >
            <KindIcon className="h-3 w-3" strokeWidth={2.4} />
            {isExam ? l.kindExam : l.kindHomework}
          </span>

          <div className="flex items-center gap-1">
            {busy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-foreground/40" />
            ) : item.shared ? (
              <span
                title={item.sharedByName ? l.sharedBy(item.sharedByName) : l.tabs.shared}
                className="inline-flex items-center gap-1 rounded-md bg-surface-muted px-1.5 py-0.5 text-[10px] font-semibold text-foreground/55"
              >
                <Users className="h-3 w-3" />
                <span className="max-w-[7rem] truncate">
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

        <Link
          href={`/aula-virtual/mis-evaluaciones/${item.id}`}
          className="line-clamp-2 text-[15px] font-semibold leading-snug text-foreground decoration-foreground/20 underline-offset-2 hover:underline"
        >
          {item.title || "—"}
        </Link>

        <p className="text-[12.5px] font-medium tabular-nums text-foreground/50">
          {l.questions(item.questionCount)}
          <span className="mx-1.5 text-foreground/25">·</span>
          {l.points(item.pointsTotal)}
        </p>

        <div className="mt-auto flex items-center justify-between gap-2 pt-2.5">
          <span className="flex min-w-0 items-center gap-1.5 text-[11.5px] font-semibold text-foreground/45">
            {item.subjectName ? (
              <span className="truncate">{item.subjectName}</span>
            ) : null}
            {item.subjectName && item.gradeLevel ? (
              <span className="text-foreground/25">·</span>
            ) : null}
            {item.gradeLevel ? <span className="shrink-0">{item.gradeLevel}</span> : null}
            {!item.subjectName && !item.gradeLevel ? (
              <span>{l.usedIn(item.usedCount)}</span>
            ) : null}
          </span>

          {item.shared ? (
            <button
              type="button"
              onClick={onDuplicate}
              disabled={busy}
              className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-border px-2.5 text-[11.5px] font-bold text-foreground/70 transition-colors hover:border-[#0891B2]/40 hover:bg-[#0891B2]/5 hover:text-[#0e7490] disabled:opacity-50 dark:hover:text-[#22d3ee]"
            >
              <FolderInput className="h-3.5 w-3.5" />
              {l.duplicate}
            </button>
          ) : (
            <span
              className={cn(
                "shrink-0 text-[11px] font-semibold tabular-nums",
                item.usedCount > 0 ? "text-foreground/45" : "text-foreground/30",
              )}
            >
              {item.usedCount > 0 ? l.usedIn(item.usedCount) : l.notUsedYet}
            </span>
          )}
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
  const t = useT();
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
          "flex h-7 w-7 items-center justify-center rounded-md text-foreground/35 transition-all hover:bg-surface-muted hover:text-foreground",
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
          <div className="absolute right-3 top-11 z-40 w-60 rounded-xl border border-border bg-surface-elevated p-1 shadow-[0_12px_32px_-8px_rgb(16_32_29/0.24)]">
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
