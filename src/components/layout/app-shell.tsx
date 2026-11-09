"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { BottomNav } from "@/components/layout/bottom-nav";
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
    /*
      THE ROOT IS BOUNDED AT EVERY BREAKPOINT.
      `min-h-dvh` alone lets the document grow with its content, which is what the
      PHONE layout was doing: the only height bound sat on the inner column, and that
      one is `md:h-dvh`, so below `md` nothing bounded anything. `main`'s
      `overflow-y-auto` therefore never had an overflow to scroll - the document
      scrolled instead - and the fixed BottomNav drew on top of the content that ran
      under it. A wheel over the page moved nothing because there was no scrollable
      element under the pointer, only a taller document.

      The ERP shell already looked like this (`h-dvh ... overflow-hidden` on the root),
      and the comment on `main` below claims the teacher shell mirrors it. It did not.
      `h-dvh` bounds the column so `main` is the one scroll owner, and `overflow-hidden`
      stops the document from scrolling a second time on top of it.
    */
    <div className="dashboard-shell flex h-dvh flex-col overflow-hidden bg-background">
      <TeacherAcademicRealtime realtime={supabasePublic} />
      <TeacherCommsNavRealtime realtime={supabasePublic} />
      <ProfilePresenceHeartbeat realtime={supabasePublic} enabled={Boolean(user)} />
      {navOpen ? (
        <button
          type="button"
          aria-label="Cerrar menú"
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setNavOpen(false)}
        />
      ) : null}
      {/* Desktop: fixed left rail, untouched by motion. Phones use the sheet
          below, which is `md:hidden` so an inline transform can never reach
          the rail. */}
      <aside
        className={cn(
          "fixed z-50 hidden flex-col border-border bg-surface md:inset-y-0 md:left-0 md:z-40 md:flex md:translate-x-0 md:translate-y-0 md:border-r",
          /* lg = iPad landscape and wider: 40px more than md (288 -> 328px). The
             content offset below must move with it or the rail overlaps the page. */
          collapsed ? "md:w-[4.5rem]" : "md:w-72 lg:w-82",
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

      {/* Phone sheet: appears from the bottom with a spring. Lives in its own
          `md:hidden` wrapper so its inline transform never touches the rail. */}
      <AnimatePresence>
        {navOpen ? (
          <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true">
            <motion.button
              type="button"
              aria-label="Cerrar menú"
              className="absolute inset-0 bg-black/40"
              onClick={() => setNavOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.24, ease: "easeOut" }}
            />
            <motion.div
              className="absolute inset-x-0 bottom-0 flex max-h-[80dvh] flex-col rounded-t-2xl border-t border-border bg-surface pb-[env(safe-area-inset-bottom,0px)]"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 380, damping: 36, mass: 0.9 }}
            >
              <div className="flex h-14 shrink-0 items-center border-b border-border px-4">
                <Link href="/inicio" className="transition-opacity hover:opacity-85" aria-label="Weeon School">
                  <LogoCompact />
                </Link>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                <AppSidebar
                  open={navOpen}
                  collapsed={false}
                  commsNavAttention={commsNavAttention}
                  onNavigate={() => setNavOpen(false)}
                />
              </div>
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>

      {/*
        No height class here any more. The root bounds the column at `h-dvh`; a second
        bound on this element was the reason the phone layout had none - it was
        `md:h-dvh`, so below `md` the column was free to grow.
      */}
      <div className={`flex min-h-0 flex-1 flex-col ${collapsed ? "md:pl-[4.5rem]" : "md:pl-72 lg:pl-82"}`}>
        <AppHeader user={user} supabasePublic={supabasePublic} />
        {/*
          ONE SCROLL OWNER, EVERY VIEWPORT.

          The bug this replaces: `main` had no bounded height, so it grew with its
          content and `overflow-y-auto` on it could never scroll — the DOCUMENT
          scrolled instead. That worked by accident on tall screens and broke on a
          13" laptop, where the Comunicación pane (`h-[100dvh-4rem]`) is taller
          than the visible viewport once browser chrome is subtracted: the pane was
          clipped and could not be scrolled to.

          The column is now a bounded flex column (`min-h-dvh` root, `flex-col`),
          and `main` is `min-h-0 flex-1 overflow-y-auto`. `min-h-0` is what lets a
          flex child shrink below its content size — without it a flex item refuses
          to shrink and the overflow never triggers. Every viewport, every pane,
          same behaviour: the content column scrolls, the header and rail do not.

          This mirrors weeon-tenants' shell, which was already correct.
        */}
        <main className="w-full min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 pt-6 pb-[calc(var(--phone-nav-height)+var(--install-prompt-height)+env(safe-area-inset-bottom,0px))] sm:px-5 md:px-8 md:pb-16 [&:has(.comms-fill)]:pt-0 [&:has(.comms-fill)]:pb-0">
          {children}
        </main>
      </div>

      <BottomNav
        commsNavAttention={commsNavAttention}
        onMenu={() => setNavOpen(true)}
      />
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
