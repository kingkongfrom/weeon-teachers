"use client";

import { Menu } from "lucide-react";
import { AccountMenu } from "@/components/layout/account-menu";
import { NotificationsMenu } from "@/components/layout/notifications-menu";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { LogoMark } from "@/components/brand/logo";
import type { AppUser } from "@/components/layout/app-shell";

type AppHeaderProps = {
  user: AppUser | null;
  onMenuToggle: () => void;
};

export function AppHeader({ user, onMenuToggle }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-border bg-surface/95 px-3 backdrop-blur-md sm:px-6 lg:px-8">
      <button
        type="button"
        onClick={onMenuToggle}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-foreground/70 hover:bg-surface-muted lg:hidden"
        aria-label="Abrir menú"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="lg:hidden">
        <LogoMark />
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
        <NotificationsMenu />
        <ThemeToggle />
        <AccountMenu user={user} />
      </div>
    </header>
  );
}
