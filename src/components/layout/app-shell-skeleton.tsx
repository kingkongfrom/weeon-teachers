"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { LogoCompact, LogoMark } from "@/components/brand/logo";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { SettingsDrawer } from "@/components/layout/settings-drawer";
import { ProfilePresenceHeartbeat } from "@/components/comms/profile-presence-heartbeat";
import { TeacherAcademicRealtime } from "@/lib/comms/teacher-academic-realtime";
import { TeacherCommsNavRealtime } from "@/lib/comms/teacher-comms-nav-realtime";
import type { AppUser } from "@/components/layout/app-shell";
import {
  useSidebarCollapsed,
  writeSidebarCollapsed,
} from "@/lib/dashboard/sidebar-state";
import type { RealtimeConfig } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";

type ShellSession = {
  userId: string;
  tenantId: string;
  name: string;
  role: "teacher";
  username: string | null;
  avatarStoragePath: string | null;
};

type ShellChrome = {
  tenantName: string | null;
  logoUrl: string | null;
  attention: { unreadInboxCount: number; unreadChatCount: number };
  subjects: { id: string; name: string; color: string | null }[];
} | null;

/**
 * Streaming frame for `/app` routes. The chrome does not depend on the locale,
 * so a language switch repaints the page body while this frame keeps the last
 * known school/logo/unread values — no blank shell, no layout shift.
 */
export function AppShellSkeletonChrome({
  chrome,
  session,
  supabasePublic,
  children,
}: {
  chrome: ShellChrome;
  session: ShellSession;
  supabasePublic: RealtimeConfig;
  children: ReactNode;
}) {
  const [navOpen, setNavOpen] = useState(false);
  const collapsed = useSidebarCollapsed();

  const user: AppUser = {
    userId: session.userId,
    tenantId: session.tenantId,
    name: session.name,
    role: session.role,
    username: session.username,
    tenantName: chrome?.tenantName ?? null,
    logoUrl: chrome?.logoUrl ?? null,
    avatarStoragePath: session.avatarStoragePath,
    subjects: chrome?.subjects ?? [],
  };

  return (
    <div className="dashboard-shell min-h-screen bg-background">
      <TeacherAcademicRealtime realtime={supabasePublic} />
      <TeacherCommsNavRealtime realtime={supabasePublic} />
      <ProfilePresenceHeartbeat realtime={supabasePublic} enabled />

      {navOpen ? (
        <button
          type="button"
          aria-label="Cerrar menú"
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setNavOpen(false)}
        />
      ) : null}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-border bg-surface transition-[width,transform] duration-200 md:z-40 md:translate-x-0",
          navOpen ? "translate-x-0" : "-translate-x-full",
          collapsed ? "w-72 md:w-[4.5rem]" : "w-72",
        )}
      >
        <div
          className={cn(
            "flex h-16 shrink-0 items-center border-b border-border",
            collapsed ? "justify-center px-2" : "px-4",
          )}
        >
          <Link href="/inicio" className="transition-opacity hover:opacity-85" aria-label="Weeon School">
            <span className={collapsed ? "md:hidden" : undefined}>
              <LogoCompact />
            </span>
            {collapsed ? (
              <span className="hidden md:inline-flex">
                <LogoMark className="h-7 w-7" />
              </span>
            ) : null}
          </Link>
        </div>
        <button
          type="button"
          onClick={() => writeSidebarCollapsed(!collapsed)}
          className="absolute top-8 right-0 z-50 hidden h-7 w-7 -translate-y-1/2 translate-x-1/2 items-center justify-center rounded-full border border-border bg-surface text-foreground/55 transition-colors hover:bg-surface-muted hover:text-foreground md:flex"
          aria-label={collapsed ? "Expandir menú" : "Reducir menú"}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden
            className={collapsed ? "h-4 w-4 rotate-180" : "h-4 w-4"}
          >
            <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <AppSidebar
          open={navOpen}
          collapsed={collapsed}
          commsNavAttention={chrome?.attention}
          onNavigate={() => setNavOpen(false)}
        />
      </aside>

      <div className={collapsed ? "md:pl-[4.5rem]" : "md:pl-72"}>
        <header className="header-hairline sticky top-0 z-30 flex h-16 items-center gap-2 bg-surface/75 px-3 backdrop-blur-xl sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => setNavOpen(true)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-foreground/70 hover:bg-surface-muted md:hidden"
            aria-label="Menú"
          >
            <svg viewBox="0 0 24 24" fill="none" aria-hidden className="h-5 w-5">
              <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
          <Link href="/inicio" className="shrink-0 transition-opacity hover:opacity-85 md:hidden" aria-label="Ir al inicio">
            <span className="hidden sm:inline-flex">
              <LogoCompact />
            </span>
            <span className="inline-flex sm:hidden">
              <LogoMark />
            </span>
          </Link>
          <div className="flex-1" />
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <SettingsDrawer user={user} supabasePublic={supabasePublic} />
          </div>
        </header>
        <main className="w-full px-4 pb-16 pt-6 sm:px-5 md:px-8">{children}</main>
      </div>
    </div>
  );
}
