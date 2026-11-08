"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type MouseEvent,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import {
  CalendarClock,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Folder,
  GripVertical,
  Inbox,
  Mail,
  Menu,
  Paperclip,
  PenSquare,
  Plus,
  RefreshCw,
  Search,
  Send,
  Settings,
  Star,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MailboxListRowsSkeleton } from "@/components/ui/page-loading-skeletons";
import { useLiveT } from "@/lib/i18n/use-i18n";
import { COMMS_COMPOSE, COMMS_MESSAGES } from "@/lib/comms/paths";
import { ChatAvatar } from "@/components/comms/chat-avatar";
import { messagesTone } from "@/lib/comms/messages-tone";
import {
  messageTrashExit,
  messageTrashNoticeMs,
  messageTrashTransition,
} from "@/components/comms/message-trash-motion";
import { AutoReplyDialog } from "@/components/comms/auto-reply-dialog";
import { SignatureDialog } from "@/components/comms/signature-dialog";
import { MailboxDraftReadingPane } from "@/components/comms/mailbox-draft-reading-pane";
import { MailboxReadingPane } from "@/components/comms/mailbox-reading-pane";
import { UnreadCountBadge } from "@/components/comms/unread-count-badge";
import { NewFolderDialog } from "@/components/comms/new-folder-dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  deleteMessageDraft,
  deleteMessageThread,
  reorderMessageLabels,
  setThreadFolder,
  setThreadLabel,
  toggleThreadFavorite,
} from "@/lib/teachers/comms-actions";
import type { MessageDraftSummary } from "@/lib/comms/message-draft";
import type { MessageFolder, MessageLabel, MessageThreadSummary } from "@/lib/dashboard/messages";
import type { MessageMailboxSettings } from "@/lib/dashboard/message-mailbox-settings";
import { useMailRealtimeRefresh } from "@/lib/comms/mail-realtime";
import { invalidateThreadDetailCache } from "@/lib/comms/thread-detail-cache";
import type { RealtimeConfig } from "@/lib/supabase/browser";

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

/** Compact folder rail row — denser than the app-wide action nav link. */
const MAIL_FOLDER_ROW =
  "inline-flex h-10 items-center gap-2 rounded-lg px-2.5 text-[14.5px] font-medium transition-colors";

/** List vs reading split beside folder sidebar (35% / 65% from `md`). */
const MAIL_LIST_PANE =
  "w-full min-w-0 shrink-0 overflow-hidden md:min-w-[14rem] md:w-[35%] md:max-w-[35%] md:basis-[35%] md:grow-0 tablet-portrait:w-full tablet-portrait:max-w-none tablet-portrait:basis-full";
const MAIL_READ_PANE =
  "flex min-h-0 w-full min-w-0 flex-col overflow-hidden md:min-w-[16rem] md:w-[65%] md:max-w-[65%] md:shrink-0 md:basis-[65%] tablet-portrait:w-full tablet-portrait:max-w-none tablet-portrait:basis-full";

function PersonAvatar({
  name,
  imageUrl,
  unread = false,
}: {
  name: string;
  imageUrl?: string | null;
  unread?: boolean;
}) {
  return (
    <span className="relative mt-0.5 inline-flex h-10 w-10 shrink-0" aria-hidden>
      <ChatAvatar name={name} imageUrl={imageUrl} className="h-10 w-10 text-[15px]" />
      {unread ? (
        <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-surface bg-[#0f766e]" />
      ) : null}
    </span>
  );
}

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
  drafts = [],
  unreadInbox,
  favoriteCount,
  mailboxSettings,
  realtime = null,
  openThreadId = null,
}: {
  folder: MessageFolder | "draft";
  labelId: string | null;
  labels: MessageLabel[];
  threads: MessageThreadSummary[];
  drafts?: MessageDraftSummary[];
  unreadInbox: number;
  favoriteCount: number;
  mailboxSettings: MessageMailboxSettings;
  realtime?: RealtimeConfig | null;
  /** Thread to open on load, from `?thread=`. */
  openThreadId?: string | null;
}) {
  const t = useLiveT();
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
  const [autoReplyOpen, setAutoReplyOpen] = useState(false);
  const [signatureOpen, setSignatureOpen] = useState(false);
  const [localMailboxSettings, setLocalMailboxSettings] = useState(mailboxSettings);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MessageThreadSummary | null>(null);
  const [trashTargetId, setTrashTargetId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [favoriteOverrides, setFavoriteOverrides] = useState<Record<string, boolean>>({});
  const [localLabels, setLocalLabels] = useState(labels);
  const [draggingLabelId, setDraggingLabelId] = useState<string | null>(null);
  const [reorderTargetId, setReorderTargetId] = useState<string | null>(null);

  const [localDrafts, setLocalDrafts] = useState(drafts);
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);
  /**
   * Pane state below the three-column layout:
   * - phones (below `md`): folders → list → message.
   * - iPad portrait: two columns (folders + list); `open` swaps the list for
   *   the reading pane, which carries a back button.
   */
  const [phonePane, setPhonePane] = useState<"folders" | "list" | "open">("list");
  const [draftDeleteTarget, setDraftDeleteTarget] = useState<MessageDraftSummary | null>(null);
  const [draftDeleting, setDraftDeleting] = useState(false);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setLocalDrafts(drafts);
  }, [drafts]);

  useEffect(() => {
    setLocalLabels(labels);
  }, [labels]);

  useEffect(() => {
    setLocalMailboxSettings(mailboxSettings);
  }, [mailboxSettings]);

  useEffect(
    () => () => {
      if (noticeTimer.current) clearTimeout(noticeTimer.current);
    },
    [],
  );

  /*
   * SUPPRESS THE PREVIOUS FOLDER'S ROWS WHILE A FOLDER CHANGE IS IN FLIGHT.
   *
   * `threads` is a server prop, so switching folder is a navigation with a real
   * round trip. Until the new payload lands React keeps the OLD folder's rows
   * mounted: measured 10 Sent messages still on screen after clicking Inbox.
   * The user reads that as flicker, or as data being lost.
   *
   * `useSearchParams` CANNOT detect this — it only updates once the navigation
   * commits, so during the wait it still reports the old URL and both sides
   * agree. The destination has to be captured AT CLICK TIME, from the link the
   * user pressed, which is what `pendingFolder` records. It clears as soon as a
   * render sees `folder` matching the request.
   */
  const [pendingFolder, setPendingFolder] = useState<string | null>(null);
  const dataFolder = folder === "draft" ? "drafts" : folder;
  useEffect(() => {
    if (pendingFolder && pendingFolder === dataFolder) setPendingFolder(null);
  }, [pendingFolder, dataFolder]);

  /*
   * REFRESH. `router.refresh()` has no completion callback, so the only honest
   * "data arrived" signal is the `threads` prop changing identity. The old code
   * spun the icon for a fixed 800ms and stopped whether or not data had arrived,
   * while the list kept showing old rows — the same false state the folder
   * switch produced. Now one flag drives BOTH the icon and the skeleton, and it
   * clears when `threads` is replaced.
   *
   * A timeout is kept only as a safety net: a failed refresh must not strand the
   * skeleton forever.
   */
  const [isRefreshing, setIsRefreshing] = useState(false);
  const refreshGuard = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    // Only a refresh can be cleared here; a normal mount has nothing pending.
    if (!isRefreshing) return;
    setIsRefreshing(false);
    if (refreshGuard.current) clearTimeout(refreshGuard.current);
    // `threads` IS the signal, so it belongs in the list despite not being read.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threads]);
  useEffect(
    () => () => {
      if (refreshGuard.current) clearTimeout(refreshGuard.current);
    },
    [],
  );

  const dataIsStale = (pendingFolder !== null && pendingFolder !== dataFolder) || isRefreshing;

  const localThreads = useMemo(() => {
    if (dataIsStale) return [];
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
  }, [threads, removedThreadIds, query, unreadOnly, dataIsStale]);

  /*
   * INITIAL SELECTION FROM `?thread=`.
   *
   * Seeded here rather than in an effect so the thread is open on the FIRST
   * render — an effect would paint the list with no selection, then flip, which
   * is the flash this workspace already fought elsewhere. A deep link from the
   * Comunicación hub arrives this way now that the detail page is gone.
   */
  const [selectedId, setSelectedId] = useState<string | null>(openThreadId);
  const [readThreadIds, setReadThreadIds] = useState<Set<string>>(() => new Set());
  const openId = localThreads.some((row) => row.id === selectedId)
    ? selectedId
    : (localThreads[0]?.id ?? null);
  const displayThreads = useMemo(
    () =>
      localThreads.map((row) =>
        readThreadIds.has(row.id) ? { ...row, unread: false } : row,
      ),
    [localThreads, readThreadIds],
  );
  const openDraftId = localDrafts.some((row) => row.id === selectedDraftId)
    ? selectedDraftId
    : (localDrafts[0]?.id ?? null);
  const openDraftSummary = localDrafts.find((row) => row.id === openDraftId) ?? null;
  const openThreadSummary = displayThreads.find((row) => row.id === openId) ?? null;

  const invalidateOpenThreadCache = useCallback(() => {
    if (openId) invalidateThreadDetailCache(openId);
  }, [openId]);

  useMailRealtimeRefresh(realtime, folder !== "draft", invalidateOpenThreadCache);

  const handleThreadRead = useCallback((threadId: string) => {
    setReadThreadIds((current) => {
      if (current.has(threadId)) return current;
      const next = new Set(current);
      next.add(threadId);
      return next;
    });
  }, []);

  function refreshMailbox() {
    router.refresh();
  }

  function handleDraftDeleted(id: string) {
    setLocalDrafts((current) => current.filter((row) => row.id !== id));
    setSelectedDraftId((current) => (current === id ? null : current));
    setDraftDeleteTarget(null);
    refreshMailbox();
  }

  async function deleteDraftById(id: string) {
    if (draftDeleting) return;
    setDraftDeleting(true);
    const res = await deleteMessageDraft(id);
    setDraftDeleting(false);
    if (!res.ok) return;
    handleDraftDeleted(id);
  }

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
      id: "sent",
      label: t("comms.folderSent"),
      icon: Send,
      href: `${COMMS_MESSAGES}?folder=sent`,
    },
    {
      id: "favorite",
      label: t("comms.folderFavorites"),
      icon: Star,
      href: `${COMMS_MESSAGES}?folder=favorite`,
      count: favoriteCount,
    },
    {
      id: "drafts",
      label: t("comms.folderDrafts"),
      icon: Mail,
      href: `${COMMS_MESSAGES}?folder=drafts`,
      count: localDrafts.length,
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
    /*
     * FEEDBACK FIRST, ROUND TRIP SECOND.
     *
     * This awaited the server, then showed the notice, then refreshed the whole
     * mailbox — so a one-tap toggle felt like a page load. The override above
     * already applied the change, so the star is correct immediately and the
     * notice belongs beside it. The request still runs; a failure rolls back.
     */
    showNotice(favorite ? t("comms.addedToFavorites") : t("comms.removedFromFavorites"));
    if (folder === "favorite" && !favorite) {
      setRemovedThreadIds((current) => [...current, threadId]);
    }

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
    /* Deferred: the optimistic state is already right, so this refetch is only for
     * counts and folders and must not gate what the user sees. */
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

  const previewToolbar =
    openId && openThreadSummary
      ? {
          threadId: openId,
          allowReplies: openThreadSummary.allowReplies ?? false,
          fullThreadHref: `${COMMS_MESSAGES}/${openId}`,
          folder: folder === "draft" ? ("sent" as const) : folder,
          isFavorite: isThreadFavorite(openThreadSummary),
          isMine: openThreadSummary.mine,
          busy: busyId === openId,
          onToggleFavorite: () => void setFavorite(openId, !isThreadFavorite(openThreadSummary)),
          onMoveToTrash: () => setTrashTargetId(openId),
          onRestore:
            folder === "trash"
              ? () => void moveTo(openId, openThreadSummary.mine ? "sent" : "inbox")
              : undefined,
          onDeletePermanently:
            folder === "trash" && openThreadSummary.mine
              ? () => setDeleteTarget(openThreadSummary)
              : undefined,
          /*
           * NO `onBack` IN THE THREAD TOOLBAR.
           *
           * It rendered a caret immediately left of the star — visually adjacent
           * to it rather than to the edge, so it read as a stray control beside
           * the star instead of "go back". The phone pane already has its own
           * back affordance in the list header, and the reading pane's own back
           * control covers tablet portrait, so this one duplicated both while
           * sitting in the wrong place.
           */
        }
      : null;

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
      if (target === "trash") {
        setTrashTargetId(threadId);
        return;
      }
      void moveTo(threadId, target);
    },
  });

  return (
    <div className="relative flex h-full min-h-0 w-full flex-col gap-3 max-md:gap-0">
      <AnimatePresence>
        {notice ? (
          <motion.div
            role="status"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            /*
             * RISES FROM THE BOTTOM ON A PHONE.
             *
             * `top-20` sat under the header, where the eye is not: a thumb-driven
             * interface should give feedback near the thumb, and the bottom is
             * where the platform's own transient bars live. Below `sm` it sits just
             * above the fixed nav; from `sm` up the original placement is kept.
             *
             * Translucent with a blur rather than solid: a transient confirmation,
             * and letting the list read through keeps it from feeling like a
             * modal. `--phone-nav-height` is THIS repo's token; weeon-tenants calls
             * it `--phone-bottom-bar`, and naming the wrong one silently voids the
             * whole calc().
             */
            className="pointer-events-none fixed left-1/2 z-50 -translate-x-1/2 rounded-full border border-white/10 bg-foreground/80 px-3.5 py-2 text-[13px] font-semibold text-background shadow-lg backdrop-blur-md max-sm:bottom-0 max-sm:top-auto max-sm:mb-[calc(var(--phone-nav-height)+0.75rem+env(safe-area-inset-bottom,0px))] sm:top-20 sm:text-sm"
          >
            {notice}
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="flex h-full min-h-0 w-full min-w-0 flex-1 overflow-hidden">
        <aside
          className={cn(
            "flex shrink-0 flex-col overflow-y-auto border-border",
            phonePane === "folders" &&
              "w-full border-r-0 md:w-[11.5rem] md:border-r lg:w-56",
            phonePane === "list" &&
              "hidden border-r md:flex md:w-[11.5rem] lg:w-56",
            // iPad portrait: rail rides with the list, leaves for the reader.
            phonePane === "open" && "hidden md:flex md:w-[11.5rem] lg:w-56 tablet-portrait:hidden",
          )}
        >
          <div className="flex h-16 shrink-0 items-center px-2 pt-3">
            <Link
              href={COMMS_COMPOSE}
              title={t("comms.composeMessage")}
              aria-label={t("comms.composeMessage")}
              className="btn-ink inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg px-3 text-[14px] font-semibold shadow-sm transition-colors"
            >
              <PenSquare className="h-[18px] w-[18px] shrink-0" />
              <span className="truncate">{t("comms.composeMessage")}</span>
            </Link>
          </div>
          <div className="flex flex-col gap-px px-1.5 pb-2 pt-1">
          {folders.map((item) => {
            const Icon = item.icon;
            const active =
              !item.disabled &&
              !labelId &&
              (item.id === "drafts" ? folder === "draft" : item.id === folder);
            const body = (
              <>
                <Icon className="h-5 w-5 shrink-0" />
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                {item.id === "inbox" ? (
                  <UnreadCountBadge count={item.count ?? 0} />
                ) : item.count && item.count > 0 ? (
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums",
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
                  className={cn(MAIL_FOLDER_ROW, "cursor-not-allowed text-foreground/30")}
                >
                  {body}
                </span>
              );
            }
            return (
              <Link
                key={item.id}
                href={item.href}
                onClick={() => {
                  setPhonePane("list");
                  setSidebarOpen(false);
                  /* Record the DESTINATION now — the URL still reports the old
                   * folder until the navigation commits. No-op when re-clicking
                   * the folder already shown. */
                  if (item.id !== dataFolder) setPendingFolder(item.id);
                }}
                className={cn(
                  MAIL_FOLDER_ROW,
                  active ? "bg-accent/10 text-accent" : "text-foreground/70 hover:bg-foreground/[0.04] hover:text-foreground",
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
                        active ? "bg-accent/10 text-foreground" : "text-foreground/70 hover:bg-foreground/[0.04]",
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
              {/*
                A button, not a Link. The signature is one rich-text field and a
                Save button; sending the user to /comunicacion/configuracion and
                losing the mailbox for that is more navigation than the task has.
                It now opens a dialog, exactly like the auto-reply row beneath it.
                The route stays for deep links and renders the same editor.
              */}
              <button
                type="button"
                onClick={() => setSignatureOpen(true)}
                className="inline-flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-semibold text-foreground/70 transition-colors hover:bg-surface-muted/60 hover:text-foreground"
              >
                <PenSquare className="h-4 w-4" />
                <span className="flex-1 text-left">{t("comms.mailboxSignatureLink")}</span>
              </button>
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
          </div>
        </aside>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="flex h-16 shrink-0 items-center gap-1.5 bg-surface px-2 pt-3 pb-3">
            <button
              type="button"
              onClick={() => setPhonePane(phonePane === "open" ? "list" : "folders")}
              aria-label={phonePane === "open" ? t("comms.backToMessages") : t("comms.foldersSection")}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-foreground/70 hover:bg-foreground/[0.05] md:hidden"
            >
              <ChevronLeft className="h-4 w-4 shrink-0" />
            </button>
            <button
              type="button"
              onClick={() => setSidebarOpen((current) => !current)}
              aria-label={t("comms.messagesTitle")}
              aria-pressed={sidebarOpen}
              className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-full text-foreground/60 hover:bg-foreground/[0.05] md:inline-flex lg:hidden"
            >
              <Menu className="h-3.5 w-3.5" />
            </button>
            {/*
              The search bar spans exactly the mail LIST column, not a guess at
              it. It carried `md:w-[39.7%]` — a hand-measured number that never
              matched MAIL_LIST_PANE's 35%, so the rounded field and the card
              column beneath it ended at different x positions. It now uses the
              same declarations as the pane (width, max-width, basis), so the two
              cannot drift apart when either one changes.
            */}
            <label className="flex min-w-0 flex-1 items-center gap-1.5 rounded-full bg-surface-muted/70 px-2.5 py-2 md:w-[35%] md:max-w-[35%] md:basis-[35%] md:grow-0 md:flex-none tablet-portrait:w-auto tablet-portrait:flex-1">
              <Search className="h-3.5 w-3.5 shrink-0 text-foreground/40" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t("comms.searchMessages")}
                className="h-5 w-full min-w-0 bg-transparent text-[13px] text-foreground outline-none placeholder:text-foreground/40"
              />
            </label>
            <button
              type="button"
              onClick={() => setUnreadOnly((current) => !current)}
              aria-pressed={unreadOnly}
              aria-label={t("comms.unreadOnly")}
              className={cn(
                "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-[12.5px] font-semibold",
                unreadOnly
                  ? "bg-accent/10 text-accent"
                  : "text-foreground/55 hover:bg-foreground/[0.05]",
              )}
            >
              <Mail className="h-5 w-5" />
              <span className="hidden sm:inline">{t("comms.unreadOnly")}</span>
            </button>
            {/*
              NO PRINT BUTTON HERE. It called `window.print()` on the MESSAGE
              LIST, which has no meaningful print output — it belongs on an open
              message, if anywhere. Removing it gives the search field room back,
              which is what made this row cramped: search plus four controls did
              not fit on a phone.
            */}
            <button
              type="button"
              disabled={isRefreshing}
              aria-label={t("comms.refreshList")}
              onClick={() => {
                /*
                 * THE LIST MUST SHOW THE SKELETON TOO, NOT JUST THIS ICON.
                 *
                 * The icon spun for a fixed 800ms and stopped whether or not the
                 * data had arrived, while the list below kept showing the OLD
                 * rows — the same false state the folder switch produced. It now
                 * goes through `isRefreshing`, which the list treats as stale, so
                 * the skeleton stays until `refreshing` clears.
                 */
                setIsRefreshing(true);
                router.refresh();
                /* Safety net only — the real clear is the `threads` change. A
                 * failed refresh must not leave the skeleton up forever. */
                if (refreshGuard.current) clearTimeout(refreshGuard.current);
                refreshGuard.current = setTimeout(() => setIsRefreshing(false), 15000);
              }}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-foreground/50 hover:bg-foreground/[0.05] disabled:opacity-60"
            >
              <RefreshCw className={cn("h-5 w-5", isRefreshing && "animate-spin")} />
            </button>
          </div>
          <div className="flex min-h-0 min-w-0 flex-1">
        <section
          className={cn(
            /*
             * `bg-surface` IS THE FIX FOR THE GAP AT THE BOTTOM.
             *
             * The section had no background, so whatever the page canvas paints
             * showed through. Where the comms pane ends a few pixels above the
             * fixed bottom nav — which happens on a device whose safe-area inset
             * makes `100dvh` smaller than the nav's real height — those pixels
             * appeared as an empty strip under the last message.
             *
             * Painting the list's own surface means the list always reads as
             * reaching the bottom, independent of the pane arithmetic. It does
             * NOT change the pane formula, which is frozen.
             */
            "flex min-h-0 flex-col overflow-hidden border-r border-border bg-surface",
            MAIL_LIST_PANE,
            phonePane === "open"
              ? "hidden md:flex tablet-portrait:hidden"
              : "flex",
          )}
        >
          {/*
            BOTTOM PADDING ON THE SCROLL CONTENT, not on the container.
            The list already reaches the bottom bar (measured: scroller bottom
            655, nav top 655), but with no padding the final row was clipped
            flush against it — the last message looked cut off. `scroll-pb`
            keeps the padding INSIDE the scroll area so the last row can be
            scrolled clear of the bar instead of underneath it.

            `env(safe-area-inset-bottom)` is added because a device with a home
            indicator reserves extra space the emulated viewport does not have.
            The pane's own formula must NOT be changed to compensate — it is
            frozen (docs/chat-layout-do-not-touch.md).
          */}
          {/*
            BOTTOM CLEARANCE FOR THE FIXED FOOTER — MEASURED, NOT GUESSED.

            The scroller does NOT need to reserve the footer's height. Measured
            on a Pixel 5 viewport (727px):

              footer top            655
              footer height          72   (min-h 56 + pb 14 + 1px border)
              scroller bottom       657   ← it already ends AT the bar
              actual overlap          2   ← only the border

            So the list is not hidden behind the whole bar; it overhangs by the
            border and nothing else. An earlier value of `0.5rem + nav-height`
            reserved 78px for a 2px overhang — that was the "too much margin".

            A small pad covers the overhang plus breathing room. `env()` is kept
            for a device whose home indicator really does sit under the scroller.
          */}
          <div className="min-h-0 flex-1 overflow-y-auto [padding-bottom:calc(0.75rem+env(safe-area-inset-bottom,0px))]">
          {!labelId && folder === "inbox" && unreadInbox > 0 ? (
            <div className="border-b border-border px-2 py-2">
              <span className={cn("rounded-full px-2 py-0.5 text-xs font-bold", messagesTone.accentMuted)}>
                {t("comms.unreadCount", { n: unreadInbox })}
              </span>
            </div>
          ) : null}

          {folder === "draft" ? (
            localDrafts.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <p className="text-sm font-semibold text-foreground">{t("comms.emptyDrafts")}</p>
                <p className="mx-auto mt-1 max-w-sm text-xs font-medium text-foreground/50">
                  {t("comms.emptyDraftsBody")}
                </p>
              </div>
            ) : (
              <ul className="flex min-h-full flex-col content-start gap-0.5 p-0 md:p-2">
                {localDrafts.map((draft) => (
                  <li key={draft.id} className="group relative">
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        setSelectedDraftId(draft.id);
                        setPhonePane("open");
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setSelectedDraftId(draft.id);
                          setPhonePane("open");
                        }
                      }}
                      className={cn(
                        "relative w-full cursor-pointer rounded-none px-[10px] py-2 pr-12 text-left hover:bg-foreground/[0.04] md:rounded-xl md:px-2.5",
                        openDraftId === draft.id && "bg-accent/10",
                      )}
                    >
                      <span className="absolute right-1.5 top-2 text-[11px] tabular-nums text-foreground/45">
                        {formatListTime(draft.updatedAt)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <p className="line-clamp-1 text-sm font-semibold text-foreground">
                          {draft.subject.trim() || t("comms.draftNoSubject")}
                        </p>
                        <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-foreground/45">
                          {draft.preview || t("comms.emptyDraftsBody")}
                        </p>
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setDraftDeleteTarget(draft);
                      }}
                      className="absolute bottom-1 right-1 rounded-lg p-1.5 text-foreground/35 transition-opacity hover:bg-error/10 hover:text-error md:opacity-0 md:group-hover:opacity-100"
                      aria-label={t("comms.deleteDraft")}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )
          ) : dataIsStale ? (
            /*
             * SKELETON, NOT "NO HAY MENSAJES".
             *
             * While the next folder is in flight `localThreads` is deliberately
             * empty, so this used to fall through to the empty-state below and
             * assert there are no messages — false, and it reads as data loss.
             * Rows shaped like the real ones hold the layout steady, so the list
             * does not jump when the data lands.
             */
            <MailboxListRowsSkeleton count={6} />
          ) : localThreads.length === 0 ? (
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
            /*
             * `min-h-full` SO THE LIST FILLS ITS CONTAINER.
             *
             * With few messages the list was content-height, so it ended at the
             * last row and the empty space below belonged to the scroll area —
             * not to the list. Visually the list appeared to stop short of the
             * bottom nav, which is what the owner kept reporting.
             *
             * `min-h-full` makes the list at least as tall as the scroller, so
             * its own surface reaches the bottom whether it holds two messages
             * or twenty. `content-start` keeps the rows packed to the top
             * instead of stretching them apart.
             */
            <motion.ul
              layout
              className="flex min-h-full flex-col content-start gap-0.5 p-0 md:p-2"
            >
              <AnimatePresence mode="popLayout" initial={false}>
                {displayThreads.map((thread) => (
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
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        setSelectedId(thread.id);
                        setPhonePane("open");
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setSelectedId(thread.id);
                          setPhonePane("open");
                        }
                      }}
                      className={cn(
                        /*
                         * `pr-12` ON THE ROW ITSELF.
                         *
                         * The star and trash are absolutely pinned to the row's
                         * bottom-right, so any child without its own right padding
                         * (the author name, the subject line) runs under them. The
                         * drafts row already reserved this; the thread row did not,
                         * which is why the icons landed on top of the name.
                         */
                        "relative w-full cursor-pointer rounded-none px-[10px] py-2 pr-12 text-left transition-colors hover:bg-foreground/[0.04] md:rounded-xl md:px-2.5 md:pr-12",
                        openId === thread.id && "bg-accent/10",
                        /*
                         * UNREAD: a left accent rail plus a bolder name. The row
                         * previously looked identical whether read or unread, even
                         * though the sidebar carried an unread badge — the list
                         * gave no way to tell which message was new.
                         */
                        thread.unread && "before:absolute before:inset-y-1.5 before:left-0 before:w-[3px] before:rounded-r-full before:bg-accent",
                      )}
                    >
                      {folder !== "trash" ? (
                        <div
                          className={cn(
                            // Reserve room for the hover actions so the preview
                            // text never runs underneath them. The buttons are
                            // absolutely placed, so without this padding the
                            // preview's last line collided with them (visible as
                            // text running through the star and trash icons).
                            "absolute bottom-0.5 right-1 z-10 flex items-center gap-0.5",
                            "md:opacity-0 md:transition-opacity md:group-hover:opacity-100",
                          )}
                        >
                          <button
                            type="button"
                            aria-label={
                              isThreadFavorite(thread)
                                ? t("comms.removedFromFavorites")
                                : t("comms.addedToFavorites")
                            }
                            onClick={(event) => void toggleFavorite(thread, event)}
                            className={cn(
                              "inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
                              isThreadFavorite(thread)
                                ? "text-amber-500 opacity-100 hover:text-amber-600"
                                : "text-foreground/45 hover:bg-surface-muted hover:text-amber-500",
                            )}
                          >
                            <Star
                              className="h-4 w-4"
                              fill={isThreadFavorite(thread) ? "currentColor" : "none"}
                            />
                          </button>
                          <button
                            type="button"
                            aria-label={t("comms.moveToTrash")}
                            onClick={(event) => {
                              event.stopPropagation();
                              setTrashTargetId(thread.id);
                            }}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-foreground/45 hover:bg-error/10 hover:text-error"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ) : null}
                      <div className="flex min-w-0 flex-1 items-start gap-2.5">
                        <PersonAvatar
                          name={
                            thread.mine
                              ? thread.counterpart
                              : (thread.authorName ?? thread.counterpart)
                          }
                          imageUrl={thread.avatarUrl}
                          unread={thread.unread}
                        />
                      <div className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_auto] items-start gap-x-1.5 gap-y-0.5">
                        <p
                          className={cn(
                            "min-w-0 line-clamp-1 text-sm leading-tight",
                            thread.unread ? "font-bold text-foreground" : "font-semibold text-foreground/85",
                          )}
                        >
                          {thread.mine ? thread.counterpart : (thread.authorName ?? thread.counterpart)}
                        </p>
                        <span className="shrink-0 pt-0.5 text-[11px] tabular-nums leading-none text-foreground/45 group-hover:opacity-0">
                          {formatListTime(thread.lastMessageAt)}
                        </span>
                        {/*
                          TAGS INLINE WITH THE SUBJECT, not on their own grid row.

                          The tag span was `col-span-2`, so every tagged message
                          spent a whole line on a small pill — three "Circular"
                          rows each wasted ~18px. It now sits beside the subject,
                          where it reads as a label on that message rather than a
                          band of its own.
                        */}
                        <div className="col-span-2 flex min-w-0 items-center gap-1.5">
                          <p
                            className={cn(
                              "min-w-0 line-clamp-1 text-sm leading-snug",
                              thread.unread ? "font-semibold text-foreground" : "font-medium text-foreground/80",
                            )}
                          >
                            {thread.subject}
                          </p>
                          {thread.listTags.length > 0 ? (
                            <span className="flex shrink-0 flex-wrap gap-1">
                              {thread.listTags.map((tag) => (
                                <span
                                  key={tag.id}
                                  className={cn(
                                    "rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase",
                                    TAG_TONE[tag.tone] ?? TAG_TONE.slate,
                                  )}
                                >
                                  {tag.label}
                                </span>
                              ))}
                            </span>
                          ) : null}
                        </div>
                        {/*
                          PREVIEW: back to TWO lines.
                          It was clipped to one to make rows shorter, but the
                          owner did not ask for a denser list — the real problem
                          was the container not reaching the nav. Density is left
                          as it was; only the right padding stays, so the hover
                          actions never cover the text.
                        */}
                        {thread.preview ? (
                          /*
                           * THE PADDING MUST MATCH WHERE THE ICONS ACTUALLY ARE.
                           *
                           * This was `pr-[4.5rem] md:pr-0`: room was reserved on
                           * phones and then REMOVED at `md` — which is exactly the
                           * breakpoint where the hover actions appear
                           * (`md:group-hover:opacity-100`). On desktop the preview
                           * therefore ran underneath the star and trash, and the
                           * icons drew straight through the words.
                           *
                           * The actions are two 32px buttons pinned at `right-1`,
                           * so they claim roughly 72px of the row's right edge. The
                           * reservation is constant now, not conditional.
                           */
                          <p className="col-span-2 min-w-0 line-clamp-2 pr-[4.75rem] text-xs leading-relaxed text-foreground/45">
                            {thread.preview}
                          </p>
                        ) : null}
                        {thread.attachmentCount > 0 ? (
                          <span className="col-span-2 inline-flex items-center gap-1 text-[11px] text-foreground/40">
                            <Paperclip className="h-3 w-3" />
                            {thread.attachmentCount}
                          </span>
                        ) : null}
                      </div>
                      </div>
                    </div>
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
          </div>
        </section>
        <div
          className={cn(
            MAIL_READ_PANE,
            phonePane === "open" ? "flex w-full" : "hidden md:flex tablet-portrait:hidden",
          )}
        >
        {folder === "draft" ? (
          <MailboxDraftReadingPane
            draftId={openDraftId}
            summary={openDraftSummary}
            onDeleted={handleDraftDeleted}
          />
        ) : (
          <MailboxReadingPane
            threadId={openId}
            listSummary={openThreadSummary}
            onThreadRead={handleThreadRead}
            toolbar={previewToolbar}
            realtime={realtime}
          />
        )}
        </div>
        </div>
        </div>
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
        onSaved={() => {
          setSignatureOpen(false);
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
        open={trashTargetId != null}
        title={t("comms.moveToTrashConfirm")}
        description={t("comms.moveToTrashBody")}
        confirmLabel={t("comms.moveToTrash")}
        cancelLabel={t("common.cancel")}
        onConfirm={() => {
          const id = trashTargetId;
          setTrashTargetId(null);
          if (id) void moveTo(id, "trash");
        }}
        onCancel={() => setTrashTargetId(null)}
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

      <ConfirmDialog
        open={draftDeleteTarget != null}
        title={t("comms.deleteDraftConfirm")}
        description={t("comms.deleteDraftBody")}
        confirmLabel={t("comms.deleteDraft")}
        cancelLabel={t("common.cancel")}
        pending={draftDeleting}
        onConfirm={() => {
          if (draftDeleteTarget) void deleteDraftById(draftDeleteTarget.id);
        }}
        onCancel={() => setDraftDeleteTarget(null)}
      />
    </div>
  );
}
