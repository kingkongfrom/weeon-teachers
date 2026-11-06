"use client";

import {
  GraduationCap,
  Home,
  Mail,
  Menu,
  MessageCircle,
  Presentation,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UnreadCountBadge } from "@/components/comms/unread-count-badge";
import type { PanelAttention } from "@/lib/dashboard/panel-attention-model";
import { useLiveT } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

/**
 * Phone-only bottom bar: the busiest destinations, mail, and the menu button
 * (far right) that opens the full sidebar as a bottom sheet.
 */
export function BottomNav({
  commsNavAttention,
  onMenu,
}: {
  commsNavAttention?: Pick<PanelAttention, "unreadChatCount" | "unreadInboxCount">;
  onMenu: () => void;
}) {
  const pathname = usePathname();
  const t = useLiveT();

  const items: {
    href: string;
    label: string;
    icon: LucideIcon;
    badgeCount?: number;
    match?: (path: string) => boolean;
  }[] = [
    { href: "/inicio", label: t.panel.title, icon: Home },
    {
      href: "/aula-virtual",
      label: t.panel.classroom.label,
      icon: Presentation,
      match: (path) => path === "/aula-virtual" || path.startsWith("/aula-virtual/"),
    },
    {
      href: "/grupos",
      label: t.panel.grades.label,
      icon: GraduationCap,
      match: (path) => path === "/grupos" || path.startsWith("/grupos/"),
    },
    {
      href: "/comunicacion/mensajes",
      label: t.messages.hubMessagesTitle,
      icon: pathname.startsWith("/comunicacion/chat") ? MessageCircle : Mail,
      badgeCount: commsNavAttention?.unreadInboxCount,
      match: (path) => path === "/comunicacion" || path.startsWith("/comunicacion/"),
    },
  ];

  const menuActive = ["/reportes", "/horarios", "/agenda"].some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  return (
    <nav
      aria-label={t.panel.title}
      /*
       * `h-[var(--phone-nav-height)]` pins the bar to ONE known height.
       *
       * Without it the height was whatever the tallest cell worked out to
       * (padding + 32px icon + gap + the label's line box), so anything above it
       * that had to clear the footer was guessing. The composer guessed 67px and
       * drifted every time a font or padding changed.
       */
      className="fixed inset-x-0 bottom-0 z-30 flex h-[var(--phone-nav-height)] items-stretch border-t border-border bg-surface pb-[env(safe-area-inset-bottom,0px)] md:hidden"
    >
      {items.map((item) => {
        const active = item.match
          ? item.match(pathname)
          : pathname === item.href;
        const Icon = item.icon;
        const badge = item.badgeCount ?? 0;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1 py-2 text-[10px] font-semibold transition-colors",
              active
                ? "text-brand-600 dark:text-brand-300"
                : "text-foreground/55 hover:text-foreground",
            )}
          >
            <span
              className={cn(
                "relative flex h-8 w-8 items-center justify-center rounded-xl transition-colors",
                active && "bg-brand-50 dark:bg-brand-950/50",
              )}
            >
              <Icon className="h-[18px] w-[18px]" aria-hidden />
              {badge > 0 ? (
                <UnreadCountBadge count={badge} absolute className="-right-1 -top-1" />
              ) : null}
            </span>
            <span className="max-w-full truncate">{item.label}</span>
          </Link>
        );
      })}

      <button
        type="button"
        onClick={onMenu}
        className={cn(
          "flex min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1 py-2 text-[10px] font-semibold transition-colors",
          menuActive
            ? "text-brand-600 dark:text-brand-300"
            : "text-foreground/55 hover:text-foreground",
        )}
      >
        <span
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-xl transition-colors",
            menuActive && "bg-brand-50 dark:bg-brand-950/50",
          )}
        >
          <Menu className="h-[18px] w-[18px]" aria-hidden />
        </span>
        <span className="max-w-full truncate">{t.agenda.title}</span>
      </button>
    </nav>
  );
}
