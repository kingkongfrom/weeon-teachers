"use client";

import { useEffect, useRef, useState } from "react";
import { SignOutButton } from "@/components/layout/sign-out-button";
import type { AppUser } from "@/components/layout/app-shell";

export function AccountMenu({
  user,
  className,
}: {
  user: AppUser | null;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  if (!user) return null;

  const initials = initialsOf(user.name);

  return (
    <div ref={rootRef} className={className ? `relative ${className}` : "relative"}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="h-9 w-9 overflow-hidden rounded-full brand-gradient outline-none ring-offset-2 ring-offset-surface transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Cuenta"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="flex h-full w-full items-center justify-center text-xs font-bold text-white">
          {initials}
        </span>
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-xl border border-border bg-surface p-1"
        >
          <div className="border-b border-border px-3 py-2.5">
            <p className="truncate text-sm font-semibold text-foreground">{user.name}</p>
            <p className="truncate text-xs text-foreground/50">
              {user.username ?? (user.role === "admin" ? "Administración" : "Docente")}
            </p>
          </div>
          <SignOutButton variant="menu" />
        </div>
      ) : null}
    </div>
  );
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.charAt(0) ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1].charAt(0) : "";
  return (first + last).toUpperCase() || "W";
}
