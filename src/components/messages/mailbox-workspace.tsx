"use client";

import { useState, type DragEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Inbox, PenSquare, Send, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/client";
import { TONE_PILL } from "@/lib/dashboard/tones";
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

/** Mailbox (sidebar layout): Redactar + folders, list on the right. */
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
    <div className="grid gap-5 lg:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="flex flex-col gap-2">
        <Link
          href="/comunicacion/nuevo"
          className="brand-gradient mb-1 inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold text-white shadow-sm transition-all hover:brightness-105 active:scale-[0.98]"
        >
          <PenSquare className="h-4 w-4" />
          {m.compose}
        </Link>

        {folders.map((item) => {
          const Icon = item.icon;
          const active = item.id === folder;
          return (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                "inline-flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
                active || dropTarget === item.id
                  ? TONE_PILL.purple
                  : "ui-hover text-foreground/65 hover:text-foreground",
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
                    className="ui-hover flex items-start gap-3 px-4 py-3.5"
                  >
                    <span
                      className={cn(
                        "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                        thread.unread ? "bg-[#0f766e] dark:bg-[#5eead4]" : "bg-transparent",
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
                          <span
                            className={cn(
                              "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                              TONE_PILL.green,
                            )}
                          >
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
      </section>
    </div>
  );
}
