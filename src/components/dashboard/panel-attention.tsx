"use client";

import Link from "next/link";
import { ChevronRight, ClipboardCheck, FileCheck, Inbox, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PanelAttention } from "@/lib/dashboard/panel-attention";
import { hubToneSurface, TONE_WELL, type Tone } from "@/lib/dashboard/tones";
import { useLiveT } from "@/lib/i18n/client";

type PanelAttentionProps = {
  attention: PanelAttention;
  className?: string;
};

/** Compact actionable row — only rendered when at least one count is non-zero. */
export function PanelAttentionStrip({ attention, className }: PanelAttentionProps) {
  const t = useLiveT();
  const banner = (tone: Tone) => ({
    tone: hubToneSurface(tone),
    iconTone: TONE_WELL[tone],
  });
  const items = [
    attention.gradingCount > 0
      ? {
          key: "grading",
          href: "/aula-virtual/por-evaluar",
          icon: ClipboardCheck,
          label: t.panel.attention.grading(attention.gradingCount),
          ...banner("yellow"),
        }
      : null,
    attention.unreadChatCount > 0
      ? {
          key: "chat",
          href: "/comunicacion/chat",
          icon: MessageCircle,
          label: t.panel.attention.unreadChat(attention.unreadChatCount),
          ...banner("green"),
        }
      : null,
    attention.justificationCount > 0
      ? {
          key: "justifications",
          href: attention.justificationHref ?? "/aula-virtual/justificaciones",
          icon: FileCheck,
          label: t.panel.attention.justifications(attention.justificationCount),
          ...banner("rose"),
        }
      : null,
    attention.unreadInboxCount > 0
      ? {
          key: "inbox",
          href: "/comunicacion/mensajes?folder=inbox",
          icon: Inbox,
          label: t.panel.attention.unreadInbox(attention.unreadInboxCount),
          ...banner("blue"),
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
