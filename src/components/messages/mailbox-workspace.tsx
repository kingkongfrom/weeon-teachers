"use client";

import { useEffect, useRef, useState, type DragEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { Inbox, Plus, RotateCcw, Send, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/client";
import { hubFilterChipClass, TONE_AVATAR, TONE_PILL } from "@/lib/dashboard/tones";
import {
  messageTrashExit,
  messageTrashNoticeMs,
  messageTrashTransition,
} from "@/components/messages/message-trash-motion";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { deleteMessageThread, setThreadFolder } from "@/lib/teachers/message-actions";
import type { MessageFolder, MessageThreadSummary } from "@/lib/dashboard/messages";

function relativeTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const minutes = Math.round((Date.now() - date.getTime()) / 60000);
  if (Math.abs(minutes) < 60) return `hace ${Math.max(1, minutes)} min`;
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return `hace ${hours} h`;
  return `hace ${Math.round(hours / 24)} d`;
}

/** Mailbox (sidebar layout): Redactar + folders, card-style list on the right. */
export function MailboxWorkspace({
  folder,
  threads,
}: {
  folder: MessageFolder;
  threads: MessageThreadSummary[];
}) {
  const t = useT();
  const m = t.messages;
  const common = t.common;
  const router = useRouter();
  const [localThreads, setLocalThreads] = useState(threads);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<MessageFolder | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MessageThreadSummary | null>(null);
  const [deleting, setDeleting] = useState(false);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setLocalThreads(threads);
  }, [threads]);

  useEffect(
    () => () => {
      if (noticeTimer.current) clearTimeout(noticeTimer.current);
    },
    [],
  );

  function showNotice(text: string) {
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    setNotice(text);
    noticeTimer.current = setTimeout(() => setNotice(null), messageTrashNoticeMs);
  }

  const folders: Array<{ id: MessageFolder; label: string; icon: typeof Inbox; href: string }> = [
    { id: "sent", label: m.folderSent, icon: Send, href: "/comunicacion/circulares" },
    { id: "inbox", label: m.folderInbox, icon: Inbox, href: "/comunicacion/circulares?folder=inbox" },
    { id: "trash", label: m.folderTrash, icon: Trash2, href: "/comunicacion/circulares?folder=trash" },
  ];

  async function moveTo(threadId: string, next: MessageFolder) {
    if (busyId) return;

    const snapshot = localThreads;
    const isTrash = next === "trash" && folder !== "trash";

    if (isTrash) {
      setBusyId(threadId);
      setLocalThreads((current) => current.filter((row) => row.id !== threadId));
      const res = await setThreadFolder(threadId, next);
      setBusyId(null);
      if (!res.ok) {
        setLocalThreads(snapshot);
        return;
      }
      showNotice(m.movedToTrash);
      router.refresh();
      return;
    }

    setBusyId(threadId);
    const res = await setThreadFolder(threadId, next);
    setBusyId(null);
    if (!res.ok) return;
    setLocalThreads((current) => current.filter((row) => row.id !== threadId));
    router.refresh();
  }

  async function deletePermanently(threadId: string) {
    if (deleting) return;
    const snapshot = localThreads;
    setDeleting(true);
    setLocalThreads((current) => current.filter((row) => row.id !== threadId));
    const res = await deleteMessageThread(threadId);
    setDeleting(false);
    if (!res.ok) {
      setLocalThreads(snapshot);
      return;
    }
    setDeleteTarget(null);
    router.refresh();
  }

  const dropProps = (target: MessageFolder) => ({
    onDragOver: (event: DragEvent) => {
      event.preventDefault();
      setDropTarget(target);
    },
    onDragLeave: () => setDropTarget((current) => (current === target ? null : current)),
    onDrop: (event: DragEvent) => {
      event.preventDefault();
      setDropTarget(null);
      const threadId = event.dataTransfer.getData("application/x-weeon-thread");
      if (threadId) void moveTo(threadId, target);
    },
  });

  return (
    <div className="relative flex flex-col gap-4">
      <AnimatePresence>
        {notice ? (
          <motion.div
            role="status"
            initial={{ opacity: 0, y: -12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 420, damping: 28 }}
            className="pointer-events-none fixed left-1/2 top-20 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full border border-error/25 bg-error px-4 py-2.5 text-sm font-semibold text-white shadow-lg"
          >
            <Trash2 className="h-4 w-4" aria-hidden />
            {notice}
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="flex justify-end">
        <Link
          href="/comunicacion/nuevo"
          className={cn(
            "inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold text-white shadow-sm transition-all hover:brightness-105 active:scale-[0.98]",
            TONE_AVATAR.purple,
          )}
        >
          <Plus className="h-4 w-4" aria-hidden />
          {m.compose}
        </Link>
      </div>

      <div className="grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
      <aside className="flex flex-col gap-1.5">
        {folders.map((item) => {
          const Icon = item.icon;
          const active = item.id === folder;
          return (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                "inline-flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
                hubFilterChipClass("purple", active || dropTarget === item.id),
                !active && dropTarget !== item.id && "ui-hover hover:text-foreground",
                dropTarget === item.id && item.id === "trash" && "ring-2 ring-error/40",
              )}
              {...dropProps(item.id)}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </aside>

      <section className="min-w-0">
        {localThreads.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border px-6 py-14 text-center">
            <p className="text-sm font-semibold text-foreground">{m.empty}</p>
            <p className="mx-auto mt-1 max-w-sm text-xs font-medium text-foreground/50">
              {m.emptyBody}
            </p>
          </div>
        ) : (
          <>
            <p className="mb-3 px-1 text-xs font-medium text-foreground/40">{m.moveHint}</p>
            <motion.ul layout className="flex flex-col gap-2.5">
              <AnimatePresence mode="popLayout" initial={false}>
                {localThreads.map((thread) => {
                  const columnLabel = thread.mine || folder === "sent" ? m.toLabel : m.from;
                  return (
                    <motion.li
                      key={thread.id}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0, x: 0, scale: 1 }}
                      exit={{
                        ...messageTrashExit,
                        transition: messageTrashTransition,
                      }}
                      draggable
                      onDragStart={(event) => {
                        const dragEvent = event as unknown as DragEvent;
                        dragEvent.dataTransfer.setData("application/x-weeon-thread", thread.id);
                        setDraggingId(thread.id);
                      }}
                      onDragEnd={() => setDraggingId(null)}
                      className={cn(
                        "group relative overflow-hidden rounded-2xl border border-border bg-surface transition-colors hover:bg-surface-muted/35",
                        draggingId === thread.id && "opacity-50",
                        busyId === thread.id && "border-error/40 bg-error/5",
                      )}
                    >
                      <Link
                        href={`/comunicacion/circulares/${thread.id}`}
                        className={cn(
                          "ui-hover block px-4 py-3.5",
                          folder === "trash" && thread.mine ? "pr-24" : "pr-14",
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <span
                            className={cn(
                              "mt-2 h-2 w-2 shrink-0 rounded-full",
                              thread.unread ? "bg-[#0f766e] dark:bg-[#5eead4]" : "bg-transparent",
                            )}
                            aria-hidden
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-3">
                              <p
                                className={cn(
                                  "min-w-0 truncate text-sm",
                                  thread.unread
                                    ? "font-bold text-foreground"
                                    : "font-semibold text-foreground/85",
                                )}
                              >
                                {thread.subject}
                              </p>
                              <span className="shrink-0 text-xs font-medium text-foreground/40">
                                {relativeTime(thread.lastMessageAt)}
                              </span>
                            </div>
                            <p className="mt-0.5 truncate text-xs font-medium text-foreground/55">
                              <span className="font-semibold uppercase tracking-wide text-foreground/40">
                                {columnLabel}:{" "}
                              </span>
                              {thread.counterpart}
                            </p>
                            <p className="mt-1 truncate text-xs font-medium text-foreground/45">
                              {thread.preview}
                            </p>
                            {thread.audience === "group" ||
                            thread.className ||
                            thread.attachmentCount > 0 ? (
                              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                {thread.audience === "group" ? (
                                  <span
                                    className={cn(
                                      "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                                      TONE_PILL.green,
                                    )}
                                  >
                                    {m.groupTag}
                                  </span>
                                ) : null}
                                {thread.className ? (
                                  <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[10px] font-semibold text-foreground/55">
                                    {thread.className}
                                  </span>
                                ) : null}
                                {thread.attachmentCount > 0 ? (
                                  <span className="text-[11px] font-semibold text-foreground/45">
                                    📎 {thread.attachmentCount}
                                  </span>
                                ) : null}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </Link>

                      <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-0.5">
                        {folder === "trash" ? (
                          <>
                            <button
                              type="button"
                              aria-label={m.restoreMessage}
                              title={m.restoreMessage}
                              disabled={busyId === thread.id || deleting}
                              onClick={() => void moveTo(thread.id, thread.mine ? "sent" : "inbox")}
                              className="ui-hover flex h-9 w-9 items-center justify-center rounded-xl text-foreground/45 opacity-70 transition-opacity hover:bg-surface-muted hover:text-foreground disabled:opacity-40 sm:opacity-0 sm:group-hover:opacity-100"
                            >
                              <RotateCcw className="h-4 w-4" />
                            </button>
                            {thread.mine ? (
                              <button
                                type="button"
                                aria-label={m.deletePermanently}
                                title={m.deletePermanently}
                                disabled={busyId === thread.id || deleting}
                                onClick={(event) => {
                                  event.preventDefault();
                                  event.stopPropagation();
                                  setDeleteTarget(thread);
                                }}
                                className="ui-hover flex h-9 w-9 items-center justify-center rounded-xl text-error/70 opacity-70 transition-opacity hover:bg-error/10 hover:text-error disabled:opacity-40 sm:opacity-0 sm:group-hover:opacity-100"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            ) : null}
                          </>
                        ) : (
                          <button
                            type="button"
                            aria-label={m.moveToTrash}
                            title={m.moveToTrash}
                            disabled={busyId === thread.id}
                            onClick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              void moveTo(thread.id, "trash");
                            }}
                            className="ui-hover flex h-9 w-9 items-center justify-center rounded-xl text-foreground/45 opacity-70 transition-opacity hover:bg-error/10 hover:text-error disabled:opacity-40 sm:opacity-0 sm:group-hover:opacity-100"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </motion.li>
                  );
                })}
              </AnimatePresence>
            </motion.ul>
          </>
        )}
      </section>
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        title={m.deletePermanentlyConfirm}
        description={m.deletePermanentlyBody}
        confirmLabel={m.deletePermanently}
        cancelLabel={common.cancel}
        pending={deleting}
        onConfirm={() => {
          if (deleteTarget) void deletePermanently(deleteTarget.id);
        }}
        onCancel={() => {
          if (!deleting) setDeleteTarget(null);
        }}
      />
    </div>
  );
}
