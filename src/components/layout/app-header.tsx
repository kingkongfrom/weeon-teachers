import Link from "next/link";
import { SettingsDrawer } from "@/components/layout/settings-drawer";
import { LogoCompact, LogoMark } from "@/components/brand/logo";
import type { AppUser } from "@/components/layout/app-shell";
import type { RealtimeConfig } from "@/lib/supabase/browser";

/**
 * Top bar for the content column. The brand lockup lives in the sidebar on
 * desktop; this bar keeps settings and the brand on phones.
 */
export function AppHeader({
  user,
  supabasePublic,
}: {
  user: AppUser | null;
  supabasePublic: RealtimeConfig;
}) {
  return (
    <header className="header-hairline sticky top-0 z-30 flex h-16 items-center gap-2 bg-surface/75 px-3 backdrop-blur-xl sm:px-6 lg:px-8">
      <Link
        href="/inicio"
        className="shrink-0 transition-opacity hover:opacity-85 md:hidden"
        aria-label="Ir al inicio"
      >
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
  );
}
