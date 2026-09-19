"use client";

import { useEffect, useMemo, useRef, useState, type DragEvent, type MouseEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import {
  CalendarClock,
  ChevronDown,
  ChevronRight,
  Folder,
  GripVertical,
  Inbox,
  Mail,
  Menu,
  Paperclip,
  PenSquare,
  Signature,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Send,
  Settings,
  Star,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/use-i18n";
import { COMMS_COMPOSE, COMMS_MESSAGES } from "@/lib/comms/paths";
import { messagesTone } from "@/lib/comms/messages-tone";
import {
  messageTrashExit,
  messageTrashNoticeMs,
  messageTrashTransition,
} from "@/components/comms/message-trash-motion";
import { AutoReplyDialog } from "@/components/comms/auto-reply-dialog";
import { UnreadCountBadge } from "@/components/comms/unread-count-badge";
import { NewFolderDialog } from "@/components/comms/new-folder-dialog";
import { SignatureDialog } from "@/components/comms/signature-dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  deleteMessageThread,
  reorderMessageLabels,
  setThreadFolder,
  setThreadLabel,
  toggleThreadFavorite,
} from "@/lib/teachers/comms-actions";
import type { MessageFolder, MessageLabel, MessageThreadSummary } from "@/lib/dashboard/messages";
import type { MessageMailboxSettings } from "@/lib/dashboard/message-mailbox-settings";

function formatListTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  if (sameDay) {
    return date.toLocaleTimeString("es-CR", { hour: "numeric", minute: "2-digit" });
  }
  return date.toLocaleDateString("es-CR", { month: "short", day: "numeric" });
}

const LABEL_REORDER_MIME = "application/x-weeon-label-reorder";

const TAG_TONE: Record<string, string> = {
  amber: "bg-amber-100 text-amber-900",
  green: "bg-emerald-100 text-emerald-800",
  teal: "bg-teal-100 text-teal-800",
  purple: "bg-violet-100 text-violet-800",
  slate: "bg-slate-100 text-slate-700",
};

export function MessagesWorkspace({
  folder,
  labelId,
  labels,
  threads,
  unreadInbox,
  favoriteCount,
  mailboxSettings,
}: {
  folder: MessageFolder;
  labelId: string | null;
  labels: MessageLabel[];
  threads: MessageThreadSummary[];
  unreadInbox: number;
  favoriteCount: number;
  mailboxSettings: MessageMailboxSettings;
}) {
  const t = useT();
  const router = useRouter();
  const [removedThreadIds, setRemovedThreadIds] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<MessageFolder | null>(null);
  const [dropLabelId, setDropLabelId] = useState<string | null>(null);
  const [foldersExpanded, setFoldersExpanded] = useState(true);
  const [settingsExpanded, setSettingsExpanded] = useState(false);
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [signatureOpen, setSignatureOpen] = useState(false);
  const [autoReplyOpen, setAutoReplyOpen] = useState(false);
  const [localMailboxSettings, setLocalMailboxSettings] = useState(mailboxSettings);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MessageThreadSummary | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [favoriteOverrides, setFavoriteOverrides] = useState<Record<string, boolean>>({});
  const [localLabels, setLocalLabels] = useState(labels);
  const [draggingLabelId, setDraggingLabelId] = useState<string | null>(null);
  const [reorderTargetId, setReorderTargetId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setLocalLabels(labels);
  }, [labels]);

  useEffect(() => {
    setRefreshing(false);
  }, [threads, labels, folder, labelId, unreadInbox]);

  useEffect(() => {
    setLocalMailboxSettings(mailboxSettings);
  }, [mailboxSettings]);

  useEffect(
    () => () => {
      if (noticeTimer.current) clearTimeout(noticeTimer.current);
    },
    [],
  );

  const localThreads = useMemo(() => {
    const term = query.trim().toLowerCase();
    return threads
      .filter((row) => !removedThreadIds.includes(row.id))
      .filter((row) => (unreadOnly ? row.unread : true))
      .filter((row) => {
        if (!term) return true;
        return (
          row.subject.toLowerCase().includes(term) ||
          row.counterpart.toLowerCase().includes(term) ||
          row.preview.toLowerCase().includes(term) ||
          (row.authorName ?? "").toLowerCase().includes(term)
        );
      });
  }, [threads, removedThreadIds, query, unreadOnly]);

  const folders: Array<{
    id: MessageFolder | "drafts";
    label: string;
    icon: typeof Inbox;
    href?: string;
    count?: number;
    disabled?: boolean;
  }> = [
    {
      id: "inbox",
      label: t("comms.folderInbox"),
      icon: Inbox,
      href: `${COMMS_MESSAGES}?folder=inbox`,
      count: unreadInbox,
    },
    {
      id: "favorite",
      label: t("comms.folderFavorites"),
      icon: Star,
      href: `${COMMS_MESSAGES}?folder=favorite`,
      count: favoriteCount,
    },
    {
      id: "sent",
      label: t("comms.folderSent"),
      icon: Send,
      href: COMMS_MESSAGES,
    },
    {
      id: "drafts",
      label: t("comms.folderDrafts"),
      icon: Mail,
      disabled: true,
    },
    {
      id: "trash",
      label: t("comms.folderTrash"),
      icon: Trash2,
      href: `${COMMS_MESSAGES}?folder=trash`,
    },
  ];

  function showNotice(text: string) {
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    setNotice(text);
    noticeTimer.current = setTimeout(() => setNotice(null), messageTrashNoticeMs);
  }

  async function moveTo(threadId: string, next: MessageFolder) {
    if (busyId) return;
    if (next === "favorite") {
      await setFavorite(threadId, true);
      return;
    }
    setBusyId(threadId);
    setRemovedThreadIds((current) => [...current, threadId]);
    const res = await setThreadFolder(threadId, next);
    setBusyId(null);
    if (!res.ok) {
      setRemovedThreadIds((current) => current.filter((id) => id !== threadId));
      return;
    }
    if (next === "trash") showNotice(t("comms.movedToTrash"));
    router.refresh();
  }

  function isThreadFavorite(thread: MessageThreadSummary): boolean {
    return favoriteOverrides[thread.id] ?? thread.isFavorite;
  }

  async function setFavorite(threadId: string, favorite: boolean) {
    if (busyId) return;

    const thread = threads.find((row) => row.id === threadId);
    const current = thread ? isThreadFavorite(thread) : favoriteOverrides[threadId];
    if (current === favorite) return;

    setFavoriteOverrides((currentOverrides) => ({ ...currentOverrides, [threadId]: favorite }));
    setBusyId(threadId);
    const res = await toggleThreadFavorite(threadId, favorite);
    setBusyId(null);
    if (!res.ok) {
      setFavoriteOverrides((currentOverrides) => {
        const copy = { ...currentOverrides };
        delete copy[threadId];
        return copy;
      });
      return;
    }
    showNotice(favorite ? t("comms.addedToFavorites") : t("comms.removedFromFavorites"));
    if (folder === "favorite" && !favorite) {
      setRemovedThreadIds((current) => [...current, threadId]);
    }
    router.refresh();
  }

  async function toggleFavorite(thread: MessageThreadSummary, event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    await setFavorite(thread.id, !isThreadFavorite(thread));
  }

  async function moveToLabel(threadId: string, targetLabelId: string) {
    if (busyId) return;
    setBusyId(threadId);
    setRemovedThreadIds((current) => [...current, threadId]);
    const res = await setThreadLabel(threadId, targetLabelId);
    setBusyId(null);
    if (!res.ok) {
      setRemovedThreadIds((current) => current.filter((id) => id !== threadId));
      return;
    }
    showNotice(t("comms.movedToFolder"));
    router.refresh();
  }

  async function saveLabelOrder(orderedIds: string[]) {
    const res = await reorderMessageLabels(orderedIds);
    if (!res.ok) {
      router.refresh();
      return;
    }
    router.refresh();
  }

  function applyLabelReorder(dragId: string, targetId: string) {
    if (dragId === targetId) return;
    setLocalLabels((current) => {
      const fromIndex = current.findIndex((row) => row.id === dragId);
      const toIndex = current.findIndex((row) => row.id === targetId);
      if (fromIndex < 0 || toIndex < 0) return current;
      const next = [...current];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      void saveLabelOrder(next.map((row) => row.id));
      return next;
    });
  }

  const labelRowProps = (targetLabelId: string) => ({
    onDragOver: (event: DragEvent) => {
      const isMessage = event.dataTransfer.types.includes("application/x-weeon-thread");
      const isReorder = event.dataTransfer.types.includes(LABEL_REORDER_MIME);
      if (isMessage) {
        event.preventDefault();
        setDropLabelId(targetLabelId);
      }
      if (isReorder) {
        event.preventDefault();
        setReorderTargetId(targetLabelId);
        event.dataTransfer.dropEffect = "move";
      }
    },
    onDragLeave: () => {
      setDropLabelId((current) => (current === targetLabelId ? null : current));
      setReorderTargetId((current) => (current === targetLabelId ? null : current));
    },
    onDrop: (event: DragEvent) => {
      event.preventDefault();
      setDropLabelId(null);
      setReorderTargetId(null);
      const reorderId = event.dataTransfer.getData(LABEL_REORDER_MIME);
      if (reorderId) {
        applyLabelReorder(reorderId, targetLabelId);
        return;
      }
      const threadId = event.dataTransfer.getData("application/x-weeon-thread");
      if (threadId) void moveToLabel(threadId, targetLabelId);
    },
  });

  async function deletePermanently(threadId: string) {
    if (deleting) return;
    setDeleting(true);
    setRemovedThreadIds((current) => [...current, threadId]);
    const res = await deleteMessageThread(threadId);
    setDeleting(false);
    if (!res.ok) {
      setRemovedThreadIds((current) => current.filter((id) => id !== threadId));
      return;
    }
    setDeleteTarget(null);
    router.refresh();
  }

  const favoriteDropProps = {
    onDragOver: (event: DragEvent) => {
      event.preventDefault();
      setDropTarget("favorite");
    },
    onDragLeave: () => setDropTarget((current) => (current === "favorite" ? null : current)),
    onDrop: (event: DragEvent) => {
      event.preventDefault();
      setDropTarget(null);
      const threadId = event.dataTransfer.getData("application/x-weeon-thread");
      if (threadId) void setFavorite(threadId, true);
    },
  };

  const dropProps = (target: "inbox" | "sent" | "trash") => ({
    onDragOver: (event: DragEvent) => {
      event.preventDefault();
      setDropTarget(target);
    },
    onDragLeave: () => setDropTarget((current) => (current === target ? null : current)),
    onDrop: (event: DragEvent) => {
      event.preventDefault();
      setDropTarget(null);
      const threadId = event.dataTransfer.getData("application/x-weeon-thread");
      if (!threadId) return;
      if (folder === "favorite" && target !== "trash") {
        void setFavorite(threadId, false);
        return;
      }
      void moveTo(threadId, target);
    },
  });

  return (
    <div className="relative flex w-fit max-w-full flex-col gap-4">
      <AnimatePresence>
        {notice ? (
          <motion.div
            role="status"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="pointer-events-none fixed left-1/2 top-20 z-50 -translate-x-1/2 rounded-full border border-error/25 bg-error px-4 py-2.5 text-sm font-semibold text-white shadow-lg"
          >
            {notice}
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setSidebarOpen((current) => !current)}
          className={cn(
            "inline-flex h-10 w-10 items-center justify-center rounded-xl lg:hidden",
            messagesTone.primaryButton,
          )}
        >
          <Menu className="h-5 w-5" />
        </button>
        <Link
          href={COMMS_COMPOSE}
          className={cn(
            "inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold",
            messagesTone.primaryButton,
          )}
        >
          <PenSquare className="h-4 w-4" />
          {t("comms.composeMessage")}
        </Link>
        <div className="relative min-w-[180px] flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/35" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("comms.searchMessages")}
            className="h-10 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-sm outline-none focus:border-brand-400"
          />
        </div>
        <button
          type="button"
          onClick={() => setUnreadOnly((current) => !current)}
          className={cn(
            "inline-flex h-10 items-center gap-2 rounded-xl border px-3 text-sm font-semibold",
            unreadOnly ? messagesTone.unreadFilterActive : "border-border text-foreground/70",
          )}
        >
          <Mail className="h-4 w-4" />
          {t("comms.unreadOnly")}
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border text-foreground/60"
        >
          <Printer className="h-4 w-4" />
        </button>
        <button
          type="button"
          disabled={refreshing}
          onClick={() => {
            setRefreshing(true);
            router.refresh();
          }}
          title={t("comms.refreshList")}
          aria-label={t("comms.refreshList")}
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border text-foreground/60 disabled:opacity-60"
        >
          <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
        </button>
      </div>

      <div className="flex w-fit max-w-full flex-col gap-5 lg:flex-row lg:items-start">
        <aside
          className={cn(
            "flex w-full shrink-0 flex-col gap-1 lg:w-60",
            !sidebarOpen && "hidden lg:flex",
          )}
        >
          <p className="mb-2 px-2 text-xs font-bold uppercase tracking-wider text-foreground/40">
            {t("comms.messagesTitle")}
          </p>
          {folders.map((item) => {
            const Icon = item.icon;
            const active = !item.disabled && !labelId && item.id === folder;
            const body = (
              <>
                <Icon className="h-4 w-4" />
                <span className="flex-1">{item.label}</span>
                {item.id === "inbox" ? (
                  <UnreadCountBadge count={item.count ?? 0} />
                ) : item.count && item.count > 0 ? (
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[11px] font-bold",
                      messagesTone.countBadge,
                    )}
                  >
                    {item.count}
                  </span>
                ) : null}
              </>
            );
            if (item.disabled || !item.href) {
              return (
                <span
                  key={item.id}
                  title={t("comms.comingSoon")}
                  className="inline-flex cursor-not-allowed items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-foreground/30"
                >
                  {body}
                </span>
              );
            }
            return (
              <Link
                key={item.id}
                href={item.href}
                className={cn(
                  "inline-flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
                  active ? messagesTone.activeNav : "text-foreground/70 hover:bg-surface-muted/60 hover:text-foreground",
                  dropTarget === item.id &&
                    item.id === "trash" &&
                    "ring-2 ring-error/40 bg-error/5",
                  dropTarget === item.id &&
                    item.id === "favorite" &&
                    "ring-2 ring-amber-400/60 bg-amber-50/80 dark:bg-amber-950/20",
                  dropTarget === item.id &&
                    (item.id === "inbox" || item.id === "sent") &&
                    messagesTone.dropRing,
                )}
                {...(item.id === "favorite"
                  ? favoriteDropProps
                  : item.id === "inbox" || item.id === "sent" || item.id === "trash"
                    ? dropProps(item.id)
                    : {})}
              >
                {body}
              </Link>
            );
          })}

          <div className="my-2 border-t border-border" />

          <button
            type="button"
            onClick={() => setFoldersExpanded((current) => !current)}
            className="inline-flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-foreground/70 hover:bg-surface-muted/60"
          >
            {foldersExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            <Folder className="h-4 w-4" />
            <span className="flex-1 text-left">{t("comms.foldersSection")}</span>
          </button>

          {foldersExpanded ? (
            <div className="ml-2 flex flex-col gap-0.5 border-l border-border pl-2">
              {localLabels.map((label) => {
                const active = labelId === label.id;
                return (
                  <div
                    key={label.id}
                    className={cn(
                      "flex items-stretch rounded-lg transition-colors",
                      draggingLabelId === label.id && "opacity-50",
                      reorderTargetId === label.id &&
                        draggingLabelId &&
                        draggingLabelId !== label.id &&
                        cn(messagesTone.dropBg, messagesTone.dropRing),
                      dropLabelId === label.id &&
                        !draggingLabelId &&
                        messagesTone.dropRing,
                    )}
                    {...labelRowProps(label.id)}
                  >
                    <button
                      type="button"
                      draggable
                      title={t("comms.reorderFolder")}
                      aria-label={t("comms.reorderFolder")}
                      onDragStart={(event) => {
                        event.dataTransfer.setData(LABEL_REORDER_MIME, label.id);
                        event.dataTransfer.effectAllowed = "move";
                        setDraggingLabelId(label.id);
                      }}
                      onDragEnd={() => {
                        setDraggingLabelId(null);
                        setReorderTargetId(null);
                      }}
                      className="flex shrink-0 cursor-grab items-center px-0.5 text-foreground/25 hover:text-foreground/50 active:cursor-grabbing"
                    >
                      <GripVertical className="h-4 w-4" />
                    </button>
                    <Link
                      href={`${COMMS_MESSAGES}?label=${label.id}`}
                      className={cn(
                        "inline-flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-2 text-sm font-semibold transition-colors",
                        active ? messagesTone.activeNav : "text-foreground/70 hover:bg-surface-muted/60",
                      )}
                    >
                      <span
                        className="h-3 w-3 shrink-0 rounded-sm"
                        style={{ backgroundColor: label.color }}
                      />
                      <span className="min-w-0 flex-1 truncate">{label.name}</span>
                      <span className="text-xs font-medium text-foreground/40">
                        ({label.threadCount})
                      </span>
                    </Link>
                  </div>
                );
              })}
              <button
                type="button"
                onClick={() => setNewFolderOpen(true)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-semibold",
                  messagesTone.linkHover,
                )}
              >
                <Plus className="h-4 w-4" />
                {t("comms.newFolder")}
              </button>
            </div>
          ) : null}

          <div className="my-2 border-t border-border" />

          <button
            type="button"
            onClick={() => setSignatureOpen(true)}
            className="inline-flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-foreground/70 transition-colors hover:bg-surface-muted/60 hover:text-foreground"
          >
            <Signature className="h-4 w-4" />
            <span className="flex-1 text-left">{t("comms.signatureTitle")}</span>
          </button>

          <button
            type="button"
            onClick={() => setSettingsExpanded((current) => !current)}
            className="inline-flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-foreground/70 hover:bg-surface-muted/60"
          >
            {settingsExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            <Settings className="h-4 w-4" />
            <span className="flex-1 text-left">{t("comms.settingsSection")}</span>
          </button>

          {settingsExpanded ? (
            <div className="ml-2 flex flex-col gap-0.5 border-l border-border pl-2">
              <button
                type="button"
                onClick={() => setAutoReplyOpen(true)}
                className="inline-flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-semibold text-foreground/70 transition-colors hover:bg-surface-muted/60 hover:text-foreground"
              >
                <CalendarClock className="h-4 w-4" />
                <span className="flex-1 text-left">{t("comms.autoReplyTitle")}</span>
                {localMailboxSettings.autoReplyEnabled ? (
                  <span className={cn("h-2 w-2 rounded-full", messagesTone.unreadDot)} />
                ) : null}
              </button>
            </div>
          ) : null}
        </aside>

        <section className="min-w-0 w-full max-w-5xl shrink-0 rounded-2xl border border-border bg-surface lg:w-[60rem]">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground/70">
              <span>{t("comms.selectAll")}</span>
              {!labelId && folder === "inbox" && unreadInbox > 0 ? (
                <span className={cn("rounded-full px-2 py-0.5 text-xs font-bold", messagesTone.accentMuted)}>
                  {t("comms.unreadCount", { n: unreadInbox })}
                </span>
              ) : null}
            </div>
          </div>

          {localThreads.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <p className="text-sm font-semibold text-foreground">
                {folder === "favorite" ? t("comms.emptyFavorites") : t("comms.emptyMessages")}
              </p>
              <p className="mx-auto mt-1 max-w-sm text-xs font-medium text-foreground/50">
                {folder === "favorite"
                  ? t("comms.emptyFavoritesBody")
                  : t("comms.emptyMessagesBody")}
              </p>
            </div>
          ) : (
            <motion.ul layout className="divide-y divide-border">
              <AnimatePresence mode="popLayout" initial={false}>
                {localThreads.map((thread) => (
                  <motion.li
                    key={thread.id}
                    layout
                    exit={{ ...messageTrashExit, transition: messageTrashTransition }}
                    draggable
                    onDragStart={(event) => {
                      const dragEvent = event as unknown as DragEvent;
                      dragEvent.dataTransfer.setData("application/x-weeon-thread", thread.id);
                      setDraggingId(thread.id);
                    }}
                    onDragEnd={() => setDraggingId(null)}
                    className={cn(
                      "group relative",
                      draggingId === thread.id && "opacity-50",
                      busyId === thread.id && "bg-error/5",
                    )}
                  >
                    <Link
                      href={`${COMMS_MESSAGES}/${thread.id}`}
                      className="flex items-start gap-3 px-4 py-3.5 transition-colors hover:bg-surface-muted/35"
                    >
                      <span
                        className={cn(
                          "mt-2 h-2.5 w-2.5 shrink-0 rounded-full",
                          thread.unread ? messagesTone.unreadDot : "bg-transparent",
                        )}
                      />
                      <span
                        className={cn(
                          "mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                          messagesTone.avatar,
                        )}
                      >
                        {(thread.authorName ?? thread.counterpart).slice(0, 1).toUpperCase()}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span
                            className={cn(
                              "truncate text-sm",
                              thread.unread ? "font-bold text-foreground" : "font-semibold text-foreground/85",
                            )}
                          >
                            {thread.mine ? thread.counterpart : (thread.authorName ?? thread.counterpart)}
                          </span>
                          {thread.listTags.map((tag) => (
                            <span
                              key={tag.id}
                              className={cn(
                                "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                                TAG_TONE[tag.tone] ?? TAG_TONE.slate,
                              )}
                            >
                              {tag.label}
                            </span>
                          ))}
                        </span>
                        <span
                          className={cn(
                            "mt-0.5 block truncate text-sm",
                            thread.unread ? "font-semibold text-foreground" : "font-medium text-foreground/80",
                          )}
                        >
                          {thread.subject}
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-foreground/45">
                          {thread.preview}
                        </span>
                      </span>
                      <span className="flex shrink-0 flex-col items-end gap-1 text-xs text-foreground/45">
                        <span className="flex items-center gap-1">
                          <button
                            type="button"
                            aria-label={
                              isThreadFavorite(thread)
                                ? t("comms.removedFromFavorites")
                                : t("comms.addedToFavorites")
                            }
                            onClick={(event) => void toggleFavorite(thread, event)}
                            className={cn(
                              "rounded-md p-1 transition-colors",
                              isThreadFavorite(thread)
                                ? "text-amber-500 hover:text-amber-600"
                                : "text-foreground/25 opacity-0 hover:text-amber-500 group-hover:opacity-100",
                            )}
                          >
                            <Star
                              className="h-4 w-4"
                              fill={isThreadFavorite(thread) ? "currentColor" : "none"}
                            />
                          </button>
                          <span>{formatListTime(thread.lastMessageAt)}</span>
                        </span>
                        {thread.attachmentCount > 0 ? (
                          <span className="inline-flex items-center gap-1">
                            <Paperclip className="h-3.5 w-3.5" />
                            {thread.attachmentCount}
                          </span>
                        ) : null}
                      </span>
                    </Link>
                    {folder === "trash" && thread.mine ? (
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(thread)}
                        className="absolute right-3 top-3 rounded-lg px-2 py-1 text-xs font-semibold text-error opacity-0 transition-opacity group-hover:opacity-100"
                      >
                        {t("comms.deletePermanently")}
                      </button>
                    ) : null}
                  </motion.li>
                ))}
              </AnimatePresence>
            </motion.ul>
          )}
        </section>
      </div>

      <NewFolderDialog
        open={newFolderOpen}
        onClose={() => setNewFolderOpen(false)}
        onCreated={() => router.refresh()}
      />

      <SignatureDialog
        open={signatureOpen}
        settings={localMailboxSettings}
        onClose={() => setSignatureOpen(false)}
        onSaved={(signatureBody) => {
          setLocalMailboxSettings((current) => ({ ...current, signatureBody }));
          router.refresh();
        }}
      />

      <AutoReplyDialog
        open={autoReplyOpen}
        settings={localMailboxSettings}
        onClose={() => setAutoReplyOpen(false)}
        onSaved={(next) => {
          setLocalMailboxSettings(next);
          router.refresh();
        }}
      />

      <ConfirmDialog
        open={deleteTarget != null}
        title={t("comms.deletePermanentlyConfirm")}
        description={t("comms.deletePermanentlyBody")}
        confirmLabel={t("comms.deletePermanently")}
        cancelLabel={t("common.cancel")}
        pending={deleting}
        onConfirm={() => {
          if (deleteTarget) void deletePermanently(deleteTarget.id);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
