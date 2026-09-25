import Link from "next/link";
import { ChevronRight, ClipboardCheck, FileCheck, Inbox, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PanelAttention } from "@/lib/dashboard/panel-attention";
import { getT } from "@/lib/i18n/server";

type PanelAttentionProps = {
  attention: PanelAttention;
  className?: string;
};

/** Compact actionable row — only rendered when at least one count is non-zero. */
export async function PanelAttentionStrip({ attention, className }: PanelAttentionProps) {
  const t = await getT();
  const items = [
    attention.gradingCount > 0
      ? {
          key: "grading",
          href: "/aula-virtual/por-evaluar",
          icon: ClipboardCheck,
          label: t.panel.attention.grading(attention.gradingCount),
          tone: "border-amber-200 bg-amber-50/80 text-amber-900 hover:bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100 dark:hover:bg-amber-950/45",
          iconTone: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
        }
      : null,
    attention.unreadChatCount > 0
      ? {
          key: "chat",
          href: "/comunicacion/chat",
          icon: MessageCircle,
          label: t.panel.attention.unreadChat(attention.unreadChatCount),
          tone: "border-emerald-200 bg-emerald-50/80 text-emerald-900 hover:bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-100 dark:hover:bg-emerald-950/45",
          iconTone: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300",
        }
      : null,
    attention.justificationCount > 0
      ? {
          key: "justifications",
          href: attention.justificationHref ?? "/aula-virtual/justificaciones",
          icon: FileCheck,
          label: t.panel.attention.justifications(attention.justificationCount),
          tone: "border-orange-200 bg-orange-50/80 text-orange-950 hover:bg-orange-50 dark:border-orange-900/50 dark:bg-orange-950/30 dark:text-orange-100 dark:hover:bg-orange-950/45",
          iconTone: "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300",
        }
      : null,
    attention.unreadInboxCount > 0
      ? {
          key: "inbox",
          href: "/comunicacion/mensajes?folder=inbox",
          icon: Inbox,
          label: t.panel.attention.unreadInbox(attention.unreadInboxCount),
          tone: "border-sky-200 bg-sky-50/80 text-sky-900 hover:bg-sky-50 dark:border-sky-900/50 dark:bg-sky-950/30 dark:text-sky-100 dark:hover:bg-sky-950/45",
          iconTone: "bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300",
        }
      : null,
  ].filter((item): item is NonNullable<typeof item> => item !== null);

  if (items.length === 0) return null;

  return (
    <section className={cn("flex flex-col gap-2", className)}>
      <h2 className="text-xs font-bold uppercase tracking-wide text-foreground/45">
        {t.panel.attention.title}
      </h2>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {items.map((item) => (
          <Link
            key={item.key}
            href={item.href}
            className={cn(
              "flex min-w-0 flex-1 items-center gap-3 rounded-2xl border px-4 py-3 transition-colors sm:min-w-[14rem] sm:flex-none",
              item.tone,
            )}
          >
            <span
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                item.iconTone,
              )}
              aria-hidden
            >
              <item.icon className="h-4 w-4" strokeWidth={2.2} />
            </span>
            <span className="min-w-0 flex-1 text-sm font-semibold">{item.label}</span>
            <ChevronRight className="h-4 w-4 shrink-0 opacity-60" aria-hidden />
          </Link>
        ))}
      </div>
    </section>
  );
}
