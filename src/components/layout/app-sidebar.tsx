"use client";

import type { LucideIcon } from "lucide-react";
import {
  CalendarDays,
  Clock,
  GraduationCap,
  Home,
  Mail,
  MessageCircle,
  Presentation,
  BellRing,
  FileBarChart,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UnreadCountBadge } from "@/components/comms/unread-count-badge";
import type { PanelAttention } from "@/lib/dashboard/panel-attention-model";
import { useT } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

type NavLink = {
  href: string;
  label: string;
  icon: LucideIcon;
  badgeCount?: number;
};

export function AppSidebar({
  open,
  collapsed,
  commsNavAttention,
  onNavigate,
}: {
  open: boolean;
  collapsed: boolean;
  commsNavAttention?: Pick<PanelAttention, "unreadChatCount" | "unreadInboxCount">;
  onNavigate: () => void;
}) {
  const pathname = usePathname();
  const t = useT();
  const primary: NavLink[] = [
    { href: "/inicio", label: t.panel.title, icon: Home },
    { href: "/aula-virtual", label: t.panel.classroom.label, icon: Presentation },
    { href: "/grupos", label: t.panel.grades.label, icon: GraduationCap },
    {
      href: "/comunicacion/mensajes",
      label: t.messages.hubMessagesTitle,
      icon: Mail,
      badgeCount: commsNavAttention?.unreadInboxCount,
    },
    {
      href: "/comunicacion/chat",
      label: t.messages.chatTitle,
      icon: MessageCircle,
      badgeCount: commsNavAttention?.unreadChatCount,
    },
    { href: "/reportes", label: t.reportes.title, icon: FileBarChart },
  ];

  const agenda: NavLink[] = [
    { href: "/horarios", label: t.agenda.horarios.label, icon: Clock },
    { href: "/agenda/eventos", label: t.agenda.eventos.label, icon: BellRing },
    { href: "/agenda/calendario", label: t.agenda.calendario.label, icon: CalendarDays },
  ];

  return (
    <nav
      className={cn(
        "flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto p-4",
        collapsed && "md:items-center md:px-2 md:py-3",
        open ? "flex" : "hidden md:flex",
      )}
      aria-label={t.panel.title}
    >
      {collapsed ? <div className="my-2 hidden h-px w-6 bg-border md:block" /> : null}
      <Section label={t.panel.title} collapsed={collapsed} />
      {primary.map((item) => (
        <NavItem
          key={item.href}
          item={item}
          pathname={pathname}
          collapsed={collapsed}
          onNavigate={onNavigate}
        />
      ))}
      {collapsed ? <div className="my-2 hidden h-px w-6 bg-border md:block" /> : null}
      <Section label={t.agenda.title} collapsed={collapsed} />
      {agenda.map((item) => (
        <NavItem
          key={item.href}
          item={item}
          pathname={pathname}
          collapsed={collapsed}
          onNavigate={onNavigate}
        />
      ))}
    </nav>
  );
}

function Section({ label, collapsed }: { label: string; collapsed: boolean }) {
  return (
    <div
      className={cn(
        "mt-4 mb-2 px-3 text-[10px] font-bold uppercase tracking-widest text-foreground/40 first:mt-0",
        collapsed && "md:hidden",
      )}
    >
      {label}
    </div>
  );
}

function NavItem({
  item,
  pathname,
  collapsed,
  onNavigate,
}: {
  item: NavLink;
  pathname: string;
  collapsed: boolean;
  onNavigate: () => void;
}) {
  const active =
    item.href === "/inicio"
      ? pathname === "/inicio"
      : pathname === item.href || pathname.startsWith(`${item.href}/`);
  const Icon = item.icon;
  const badge = item.badgeCount ?? 0;
  const collapsedLabel =
    collapsed && badge > 0 ? `${item.label} (${badge > 99 ? "99+" : badge})` : item.label;

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-label={collapsed ? collapsedLabel : undefined}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all",
        collapsed && "md:h-10 md:w-10 md:justify-center md:gap-0 md:px-0 md:py-0",
        active
          ? "bg-brand-50/80 text-brand-700 dark:bg-brand-950/50 dark:text-brand-300"
          : "text-foreground/70 hover:bg-surface-muted hover:text-foreground",
      )}
    >
      {active ? (
        <span
          aria-hidden
          className={cn(
            "brand-gradient absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full",
            collapsed && "md:hidden",
          )}
        />
      ) : null}
      <span
        className={cn(
          "relative flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
          active
            ? "bg-brand-100 text-brand-600 shadow-[inset_0_0_0_1px] shadow-brand-200/60 dark:bg-brand-900/50 dark:text-brand-300"
            : "bg-surface-muted text-foreground/80 group-hover:bg-surface-elevated group-hover:text-foreground",
        )}
      >
        <Icon className="h-4 w-4" strokeWidth={2.2} />
        {badge > 0 ? <UnreadCountBadge count={badge} absolute /> : null}
      </span>
      <span className={cn("min-w-0 flex-1 truncate", collapsed && "md:hidden")}>{item.label}</span>
      {!collapsed && badge > 0 ? (
        <UnreadCountBadge count={badge} className="shrink-0" />
      ) : null}
    </Link>
  );
}
