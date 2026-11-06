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
       * ───────────────────────────────────────────────────────────────────────
       *  ⛔  DO NOT TOUCH THE COMPOSER POSITION OR THE FOOTER  ⛔
       *
       *  The height floor and the bottom-padding cap below were tuned BY EYE by
       *  the owner on a real phone and signed off. Do not change them as part of
       *  another task, and do not adjust them to compensate for a composer
       *  position problem — that pair is coupled and was churned a dozen times
       *  by agents editing it blind.
       *
       *  See docs/chat-layout-do-not-touch.md.
       * ───────────────────────────────────────────────────────────────────────
       */
      /*
       * HEIGHT: the cells define it; the floor only prevents a squashed bar.
       *
       * `min-h` was 4.5rem (72px) while the cells need 59px, so the bar carried
       * ~13px of dead space under the labels — the "too much bottom padding" the
       * owner reported. The floor is 3.5rem now, below the content height, so it
       * never adds space; it only stops the bar collapsing if the cells change.
       *
       * The safe-area inset stays as padding: on a device with a home indicator
       * the bar MUST reserve it, or the labels sit under the gesture area.
       */
      /*
       * BOTTOM PADDING: the safe-area inset, CAPPED at 18px.
       *
       * The full `env(safe-area-inset-bottom)` is the device's home-indicator
       * reserve; uncapped it read as a slab of dead colour under the labels.
       * `min()` takes whichever is smaller, the device inset or the cap, so the
       * bar never carries more than the cap no matter what the device reports.
       *
       * Tuned by the owner in 10px steps: 8px was too tight, 18px is the value.
       */
      className="fixed inset-x-0 bottom-0 z-30 flex min-h-[3.5rem] items-stretch border-t border-border bg-surface pb-[min(env(safe-area-inset-bottom,0px),18px)] md:hidden"
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
              /*
               * `leading-none` on the label matters: at 11px a default line-height
               * adds ~4px the cell did not budget for, and `truncate` then clipped
               * the descenders ("Agenda" losing its g). The label now has exactly
               * its font size of vertical space.
               */
              "flex min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1 pt-1.5 pb-1 text-[11px] leading-none font-semibold transition-colors",
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
              <Icon className="h-5 w-5" aria-hidden />
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
          "flex min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1 pt-1.5 pb-1 text-[11px] leading-none font-semibold transition-colors",
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
          <Menu className="h-5 w-5" aria-hidden />
        </span>
        <span className="max-w-full truncate">{t.agenda.title}</span>
      </button>
    </nav>
  );
}
