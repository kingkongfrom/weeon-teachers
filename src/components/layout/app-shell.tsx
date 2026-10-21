"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { LogoCompact, LogoMark } from "@/components/brand/logo";
import {
  useSidebarCollapsed,
  writeSidebarCollapsed,
} from "@/lib/dashboard/sidebar-state";
import { cn } from "@/lib/utils";
import type { RealtimeConfig } from "@/lib/supabase/browser";
import { TeacherAcademicRealtime } from "@/lib/comms/teacher-academic-realtime";
import { TeacherCommsNavRealtime } from "@/lib/comms/teacher-comms-nav-realtime";
import { ProfilePresenceHeartbeat } from "@/components/comms/profile-presence-heartbeat";
import type { PanelAttention } from "@/lib/dashboard/panel-attention-model";

export type AppUser = {
  userId: string;
  tenantId: string;
  name: string;
  role: "teacher";
  username: string | null;
  tenantName: string | null;
  logoUrl: string | null;
  avatarStoragePath: string | null;
  subjects: { id: string; name: string; color: string | null }[];
};

type AppShellProps = {
  children: ReactNode;
  user: AppUser | null;
  supabasePublic: RealtimeConfig;
  commsNavAttention?: Pick<PanelAttention, "unreadChatCount" | "unreadInboxCount">;
};

export function AppShell({ children, user, supabasePublic, commsNavAttention }: AppShellProps) {
  const [navOpen, setNavOpen] = useState(false);
  const collapsed = useSidebarCollapsed();

  return (
    <div className="dashboard-shell min-h-screen bg-background">
      <TeacherAcademicRealtime realtime={supabasePublic} />
      <TeacherCommsNavRealtime realtime={supabasePublic} />
      <ProfilePresenceHeartbeat realtime={supabasePublic} enabled={Boolean(user)} />
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
        <SidebarToggle collapsed={collapsed} />
        <AppSidebar
          open={navOpen}
          collapsed={collapsed}
          commsNavAttention={commsNavAttention}
          onNavigate={() => setNavOpen(false)}
        />
      </aside>

      <div className={collapsed ? "md:pl-[4.5rem]" : "md:pl-72"}>
        <AppHeader
          user={user}
          supabasePublic={supabasePublic}
          onMenu={() => setNavOpen(true)}
        />
        <main className="mx-auto w-full max-w-[77rem] px-4 pb-16 pt-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}

function SidebarToggle({ collapsed }: { collapsed: boolean }) {
  const hint = collapsed ? "Expandir menú" : "Reducir menú";
  return (
    <button
      type="button"
      onClick={() => writeSidebarCollapsed(!collapsed)}
      className="absolute top-8 right-0 z-50 hidden h-7 w-7 -translate-y-1/2 translate-x-1/2 items-center justify-center rounded-full border border-border bg-surface text-foreground/55 transition-colors hover:bg-surface-muted hover:text-foreground md:flex"
      aria-label={hint}
    >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden
          className={collapsed ? "h-4 w-4 rotate-180" : "h-4 w-4"}
        >
          <path
            d="M15 6l-6 6 6 6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
  );
}

