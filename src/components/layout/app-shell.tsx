import type { ReactNode } from "react";
import { AppHeader } from "@/components/layout/app-header";
import type { RealtimeConfig } from "@/lib/supabase/browser";

export type AppUser = {
  userId: string;
  tenantId: string;
  name: string;
  role: "teacher" | "admin";
  username: string | null;
  tenantName: string | null;
  avatarStoragePath: string | null;
};

type AppShellProps = {
  children: ReactNode;
  user: AppUser | null;
  supabasePublic: RealtimeConfig;
};

/**
 * One shell for the whole teacher app. There is no sidebar: `/inicio` is the
 * landing with cards, and every section is reached from those cards. The header
 * keeps the brand mark pinned upper-left and offers a back path on every screen,
 * so the app navigates like a mobile app, not a web dashboard.
 */
export function AppShell({ children, user, supabasePublic }: AppShellProps) {
  return (
    <div className="dashboard-shell flex min-h-screen flex-col bg-background">
      <AppHeader user={user} supabasePublic={supabasePublic} />
      <main className="mx-auto w-full max-w-[77rem] flex-1 px-4 pb-16 pt-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
