"use client";

import { useState, type ReactNode } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { AppHeader } from "@/components/layout/app-header";
import {
  useSidebarCollapsed,
  writeSidebarCollapsed,
} from "@/lib/dashboard/sidebar-state";

export type AppUser = {
  name: string;
  role: "teacher" | "admin";
  username: string | null;
  tenantName: string | null;
};

type AppShellProps = {
  children: ReactNode;
  user: AppUser | null;
};

export function AppShell({ children, user }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const collapsed = useSidebarCollapsed();

  return (
    <div className="dashboard-shell flex min-h-screen flex-col bg-background lg:flex-row">
      <aside
        className={`relative hidden shrink-0 flex-col border-r border-border bg-surface transition-[width] duration-200 lg:flex ${
          collapsed ? "w-[4.5rem]" : "w-72"
        }`}
      >
        <Sidebar user={user} collapsed={collapsed} />
        <SidebarToggle collapsed={collapsed} />
      </aside>

      <div className="flex flex-1 flex-col">
        <AppHeader user={user} onMenuToggle={() => setMobileOpen((v) => !v)} />
        <main className="flex-1 px-4 pb-10 pt-4 sm:px-6 sm:pt-6 lg:p-8 lg:pb-8">
          {children}
        </main>
      </div>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="w-[18rem] max-w-[80vw] bg-surface">
            <Sidebar user={user} collapsed={false} />
          </div>
          <button
            type="button"
            className="flex-1 bg-black/40 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
            aria-label="Cerrar menú"
          />
        </div>
      ) : null}
    </div>
  );
}

function SidebarToggle({ collapsed }: { collapsed: boolean }) {
  return (
    <button
      type="button"
      onClick={() => writeSidebarCollapsed(!collapsed)}
      className="absolute top-8 right-0 z-50 flex h-7 w-7 -translate-y-1/2 translate-x-1/2 items-center justify-center rounded-full border border-border bg-surface text-foreground/55 transition-colors hover:bg-surface-muted hover:text-foreground"
      aria-label={collapsed ? "Expandir menú" : "Contraer menú"}
      title={collapsed ? "Expandir menú" : "Contraer menú"}
    >
      <CollapseIcon flipped={collapsed} />
    </button>
  );
}

function CollapseIcon({ flipped }: { flipped: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className={flipped ? "rotate-180" : undefined}
    >
      <path
        d="M15 6l-6 6 6 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
