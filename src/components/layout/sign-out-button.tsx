"use client";

import { signOutTeacher } from "@/lib/auth/actions";

export function SignOutButton({
  compact = false,
  variant = "default",
}: {
  compact?: boolean;
  variant?: "default" | "menu";
}) {
  const menu = variant === "menu";

  return (
    <form action={signOutTeacher}>
      <button
        type="submit"
        role={menu ? "menuitem" : undefined}
        className={
          menu
            ? "flex w-full items-center rounded-lg px-3 py-2 text-left text-sm font-semibold text-foreground/80 transition-colors hover:bg-surface-muted hover:text-foreground"
            : compact
              ? "text-xs font-semibold text-foreground/55 transition-colors hover:text-foreground"
              : "inline-flex w-full items-center justify-center rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-surface-muted"
        }
      >
        Cerrar sesión
      </button>
    </form>
  );
}
