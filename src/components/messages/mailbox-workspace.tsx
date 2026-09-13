"use client";

import { useState, type DragEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Inbox, PenSquare, Send, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/client";
import { setThreadFolder } from "@/lib/teachers/message-actions";
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

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.charAt(0) ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1].charAt(0) : "";
  return (first + last).toUpperCase() || "W";
}

/** Comunicación mailbox: folder chips + thread list (drag a row onto a chip). */
export function MailboxWorkspace({
  folder,
  threads,
}: {
  folder: MessageFolder;
  threads: MessageThreadSummary[];
}) {
  const t = useT();
  const m = t.messages;
  const router = useRouter();
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<MessageFolder | null>(null);

  const folders: Array<{ id: MessageFolder; label: string; icon: typeof Inbox; href: string }> = [
    { id: "inbox", label: m.folderInbox, icon: Inbox, href: "/comunicacion" },
    { id: "sent", label: m.folderSent, icon: Send, href: "/comunicacion?folder=sent" },
    { id: "trash", label: m.folderTrash, icon: Trash2, href: "/comunicacion?folder=trash" },
  ];

  async function moveTo(threadId: string, next: MessageFolder) {
    await setThreadFolder(threadId, next);
    router.refresh();
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {folders.map((item) => {
            const Icon = item.icon;
            const active = item.id === folder;
            return (
              <Link
                key={item.id}
                href={item.href}
                onDragOver={(event: DragEvent) => {
                  event.preventDefault();
                  setDropTarget(item.id);
                }}
                onDragLeave={() => setDropTarget((current) => (current === item.id ? null : current))}
                onDrop={(event: DragEvent) => {
                  event.preventDefault();
                  setDropTarget(null);
                  const threadId = event.dataTransfer.getData("application/x-weeon-thread");
                  if (threadId) void moveTo(threadId, item.id);
                }}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-semibold transition-colors",
                  active
                    ? "brand-gradient text-white"
                    : dropTarget === item.id
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                      : "border border-border text-foreground/65 hover:bg-surface-muted",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </div>

        <Link
          href="/comunicacion/nuevo"
          className="inline-flex h-10 items-center gap-2 rounded-xl brand-gradient px-4 text-sm font-semibold text-white transition-all hover:brightness-105 active:scale-[0.98]"
        >
          <PenSquare className="h-4 w-4" />
          {m.compose}
        </Link>
      </div>

      {threads.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface px-6 py-16 text-center">
          <p className="text-sm font-semibold text-foreground">{m.empty}</p>
          <p className="mx-auto mt-1 max-w-sm text-xs font-medium text-foreground/50">
            {m.emptyBody}
          </p>
        </div>
      ) : (
        <>
          <p className="px-1 text-xs font-medium text-foreground/40">{m.moveHint}</p>
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
                  className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-surface-muted/50"
                >
                  <span
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                      thread.unread
                        ? "brand-gradient text-white"
                        : "bg-surface-muted text-foreground/60",
                    )}
                  >
                    {initials(thread.counterpart)}
                  </span>
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
                      {thread.className ? (
                        <span className="hidden shrink-0 rounded-full bg-surface-muted px-2 py-0.5 text-[10px] font-semibold text-foreground/55 sm:inline">
                          {thread.className}
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
    </div>
  );
}
