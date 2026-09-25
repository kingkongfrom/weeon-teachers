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

export type AppUser = {
  userId: string;
  tenantId: string;
  name: string;
  role: "teacher" | "admin";
  username: string | null;
  tenantName: string | null;
  logoUrl: string | null;
  avatarStoragePath: string | null;
};

type AppShellProps = {
  children: ReactNode;
  user: AppUser | null;
  supabasePublic: RealtimeConfig;
};

export function AppShell({ children, user, supabasePublic }: AppShellProps) {
  const [navOpen, setNavOpen] = useState(false);
  const collapsed = useSidebarCollapsed();

  return (
    <div className="dashboard-shell min-h-screen bg-background">
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
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-border bg-surface transition-[width,transform] duration-200 lg:z-40 lg:translate-x-0",
          navOpen ? "translate-x-0" : "-translate-x-full",
          collapsed ? "w-[15.3rem] lg:w-[4.5rem]" : "w-[15.3rem]",
        )}
      >
        <div
          className={cn(
            "flex h-16 items-center border-b border-border",
            collapsed ? "justify-center px-2" : "px-4",
          )}
        >
          <Link href="/inicio" className="transition-opacity hover:opacity-85" aria-label="Weeon">
            <span className={collapsed ? "lg:hidden" : undefined}>
              <LogoCompact />
            </span>
            {collapsed ? (
              <span className="hidden lg:inline-flex">
                <LogoMark />
              </span>
            ) : null}
          </Link>
        </div>
        <SidebarToggle collapsed={collapsed} />
        <AppSidebar
          open={navOpen}
          collapsed={collapsed}
          onNavigate={() => setNavOpen(false)}
        />
      </aside>

      <div className={collapsed ? "lg:pl-[4.5rem]" : "lg:pl-[15.3rem]"}>
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
  return (
    <button
      type="button"
      onClick={() => writeSidebarCollapsed(!collapsed)}
      className="absolute top-8 right-0 z-50 hidden h-7 w-7 translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-surface text-foreground/55 transition-colors hover:bg-surface-muted hover:text-foreground lg:flex"
      aria-label={collapsed ? "Expandir menú" : "Reducir menú"}
      title={collapsed ? "Expandir menú" : "Reducir menú"}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden
        className={collapsed ? "rotate-180" : undefined}
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
