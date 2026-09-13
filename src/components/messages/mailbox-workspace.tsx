"use client";

import { useState, type DragEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Folder, Inbox, Loader2, PenSquare, Plus, Send, Trash2, X } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/client";
import {
  createMessageLabel,
  deleteMessageLabel,
  setThreadFolder,
  setThreadLabel,
} from "@/lib/teachers/message-actions";
import type {
  MessageFolder,
  MessageLabel,
  MessageThreadSummary,
} from "@/lib/dashboard/messages";

function relativeTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const minutes = Math.round((Date.now() - date.getTime()) / 60000);
  if (Math.abs(minutes) < 60) return `hace ${Math.max(1, minutes)} min`;
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return `hace ${hours} h`;
  return `hace ${Math.round(hours / 24)} d`;
}

/** Mailbox: folders/categories sidebar (drag targets) + the thread list. */
export function MailboxWorkspace({
  folder,
  labelId,
  labels,
  threads,
}: {
  folder: MessageFolder;
  labelId: string | null;
  labels: MessageLabel[];
  threads: MessageThreadSummary[];
}) {
  const t = useT();
  const m = t.messages;
  const router = useRouter();
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [newCategory, setNewCategory] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteLabel, setDeleteLabel] = useState<MessageLabel | null>(null);

  const folders: Array<{ id: MessageFolder; label: string; icon: typeof Inbox; href: string }> = [
    { id: "inbox", label: m.folderInbox, icon: Inbox, href: "/comunicacion" },
    { id: "sent", label: m.folderSent, icon: Send, href: "/comunicacion?folder=sent" },
    { id: "trash", label: m.folderTrash, icon: Trash2, href: "/comunicacion?folder=trash" },
  ];

  async function moveToFolder(threadId: string, next: MessageFolder) {
    await setThreadFolder(threadId, next);
    router.refresh();
  }

  async function moveToLabel(threadId: string, nextLabelId: string) {
    await setThreadLabel(threadId, nextLabelId);
    router.refresh();
  }

  async function createCategory() {
    const name = newCategory.trim();
    if (!name || creating) return;
    setCreating(true);
    setError(null);
    const res = await createMessageLabel(name);
    setCreating(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setNewCategory("");
    router.refresh();
  }

  async function confirmDeleteLabel() {
    if (!deleteLabel) return;
    const target = deleteLabel;
    setDeleteLabel(null);
    await deleteMessageLabel(target.id);
    if (labelId === target.id) router.push("/comunicacion");
    else router.refresh();
  }

  const dropProps = (key: string, onDrop: (threadId: string) => void) => ({
    onDragOver: (event: DragEvent) => {
      event.preventDefault();
      setDropTarget(key);
    },
    onDragLeave: () => setDropTarget((current) => (current === key ? null : current)),
    onDrop: (event: DragEvent) => {
      event.preventDefault();
      setDropTarget(null);
      const threadId = event.dataTransfer.getData("application/x-weeon-thread");
      if (threadId) onDrop(threadId);
    },
  });

  return (
    <div className="grid gap-5 lg:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="flex flex-col gap-2">
        <Link
          href="/comunicacion/nuevo"
          className="mb-1 inline-flex h-11 items-center justify-center gap-2 rounded-xl brand-gradient px-4 text-sm font-semibold text-white transition-all hover:brightness-105 active:scale-[0.98]"
        >
          <PenSquare className="h-4 w-4" />
          {m.compose}
        </Link>

        {folders.map((item) => {
          const Icon = item.icon;
          const active = !labelId && item.id === folder;
          return (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                "inline-flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
                active
                  ? "bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300"
                  : dropTarget === item.id
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                    : "text-foreground/65 hover:bg-surface-muted",
              )}
              {...dropProps(item.id, (threadId) => void moveToFolder(threadId, item.id))}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}

        <p className="mt-3 px-3 text-xs font-bold uppercase tracking-wide text-foreground/40">
          {m.categories}
        </p>

        {labels.map((label) => {
          const active = labelId === label.id;
          return (
            <div key={label.id} className="group/cat flex items-center">
              <Link
                href={`/comunicacion?label=${label.id}`}
                className={cn(
                  "inline-flex min-w-0 flex-1 items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
                  active
                    ? "bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300"
                    : dropTarget === label.id
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                      : "text-foreground/65 hover:bg-surface-muted",
                )}
                {...dropProps(label.id, (threadId) => void moveToLabel(threadId, label.id))}
              >
                <Folder className="h-4 w-4 shrink-0" />
                <span className="truncate">{label.name}</span>
              </Link>
              <button
                type="button"
                onClick={() => setDeleteLabel(label)}
                aria-label={m.deleteCategory}
                className="ml-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-foreground/35 opacity-0 transition-all hover:bg-error/10 hover:text-error group-hover/cat:opacity-100"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}

        <div className="mt-1 flex items-center gap-2 px-1">
          <input
            value={newCategory}
            onChange={(event) => setNewCategory(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void createCategory();
            }}
            placeholder={m.categoryNamePlaceholder}
            maxLength={60}
            className="h-9 min-w-0 flex-1 rounded-lg border border-border bg-background px-2.5 text-sm text-foreground outline-none focus:border-brand-400"
          />
          <button
            type="button"
            onClick={() => void createCategory()}
            disabled={creating || newCategory.trim().length === 0}
            aria-label={m.create}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border text-brand-600 transition-colors hover:bg-brand-50 disabled:opacity-50 dark:text-brand-300 dark:hover:bg-brand-950/30"
          >
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          </button>
        </div>
        {error ? <p className="px-2 text-xs font-medium text-error">{error}</p> : null}
      </aside>

      <section className="min-w-0">
        {threads.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border px-6 py-14 text-center">
            <p className="text-sm font-semibold text-foreground">{m.empty}</p>
            <p className="mx-auto mt-1 max-w-sm text-xs font-medium text-foreground/50">
              {m.emptyBody}
            </p>
          </div>
        ) : (
          <>
            <p className="mb-2 px-1 text-xs font-medium text-foreground/40">{m.moveHint}</p>
            <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
              {threads.map((thread) => (
                <li
                  key={thread.id}
                  draggable
                  onDragStart={(event) => {
                    event.dataTransfer.setData("application/x-weeon-thread", thread.id);
                    setDraggingId(thread.id);
                  }}
                  onDragEnd={() => setDraggingId(null)}
                  className={cn(draggingId === thread.id && "opacity-50")}
                >
                  <Link
                    href={`/comunicacion/${thread.id}`}
                    className="flex items-start gap-3 px-4 py-3.5 transition-colors hover:bg-surface-muted/50"
                  >
                    <span
                      className={cn(
                        "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                        thread.unread ? "bg-brand-500" : "bg-transparent",
                      )}
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p
                          className={cn(
                            "truncate text-sm",
                            thread.unread
                              ? "font-bold text-foreground"
                              : "font-semibold text-foreground/80",
                          )}
                        >
                          {thread.counterpart}
                        </p>
                        {thread.audience === "group" ? (
                          <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                            {m.groupTag}
                          </span>
                        ) : null}
                        {thread.attachmentCount > 0 ? (
                          <span className="shrink-0 text-[11px] font-semibold text-foreground/45">
                            📎 {thread.attachmentCount}
                          </span>
                        ) : null}
                        <span className="ml-auto shrink-0 text-xs font-medium text-foreground/40">
                          {relativeTime(thread.lastMessageAt)}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-sm font-semibold text-foreground/75">
                        {thread.subject}
                      </p>
                      <p className="truncate text-xs font-medium text-foreground/45">
                        {thread.preview}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <ConfirmDialog
        open={deleteLabel !== null}
        title={m.deleteCategory}
        description={m.deleteCategoryConfirm}
        confirmLabel={m.deleteCategory}
        cancelLabel={t.common.cancel}
        onConfirm={() => void confirmDeleteLabel()}
        onCancel={() => setDeleteLabel(null)}
      />
    </div>
  );
}
