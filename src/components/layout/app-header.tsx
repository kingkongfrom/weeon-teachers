import Link from "next/link";
import { AccountMenu } from "@/components/layout/account-menu";
import { NotificationsMenu } from "@/components/layout/notifications-menu";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { LogoCompact, LogoMark } from "@/components/brand/logo";
import type { AppUser } from "@/components/layout/app-shell";

/**
 * App-wide top bar. The brand lockup stays pinned to the upper-left on every
 * route (and links back to the landing). The way home for each screen lives
 * with that page's header, not here. No sidebar, no hamburger.
 */
export function AppHeader({ user }: { user: AppUser | null }) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-border bg-surface/95 px-3 backdrop-blur-md sm:px-6 lg:px-8">
      <Link
        href="/inicio"
        className="shrink-0 transition-opacity hover:opacity-85"
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
        <NotificationsMenu />
        <ThemeToggle />
        <AccountMenu user={user} />
      </div>
    </header>
  );
}
