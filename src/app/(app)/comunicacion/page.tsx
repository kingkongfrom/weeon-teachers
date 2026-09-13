import Link from "next/link";
import { Inbox, Megaphone, Paperclip, PenSquare, Send } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { loadMessageSummaries, type MessageFolder } from "@/lib/dashboard/messages";
import { getT } from "@/lib/i18n/server";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

function relativeTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const minutes = Math.round((Date.now() - date.getTime()) / 60000);
  if (Math.abs(minutes) < 60) return `hace ${Math.max(1, minutes)} min`;
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return `hace ${hours} h`;
  return `hace ${Math.round(hours / 24)} d`;
}

/** Comunicación — email-style inbox/sent list. */
export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ folder?: string }>;
}) {
  const { folder: folderParam } = await searchParams;
  const folder: MessageFolder = folderParam === "sent" ? "sent" : "inbox";
  const t = await getT();
  const m = t.messages;
  const threads = await loadMessageSummaries(folder);

  const folders = [
    { id: "inbox" as const, label: m.folderInbox, icon: Inbox, href: "/comunicacion" },
    { id: "sent" as const, label: m.folderSent, icon: Send, href: "/comunicacion?folder=sent" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={m.title} description={m.description} backHref="/inicio" />

      <div className="grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
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
            const active = item.id === folder;
            return (
              <Link
                key={item.id}
                href={item.href}
                className={cn(
                  "inline-flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
                  active
                    ? "bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300"
                    : "text-foreground/65 hover:bg-surface-muted",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
          <Link
            href="/comunicacion/novedades"
            className="inline-flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-foreground/65 transition-colors hover:bg-surface-muted"
          >
            <Megaphone className="h-4 w-4" />
            {m.news}
          </Link>
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
            <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
              {threads.map((thread) => (
                <li key={thread.id}>
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
                            thread.unread ? "font-bold text-foreground" : "font-semibold text-foreground/80",
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
                          <span className="inline-flex shrink-0 items-center gap-0.5 text-[11px] font-semibold text-foreground/45">
                            <Paperclip className="h-3 w-3" />
                            {thread.attachmentCount}
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
          )}
        </section>
      </div>
    </div>
  );
}
