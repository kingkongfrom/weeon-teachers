"use client";

import { cn } from "@/lib/utils";
import { CalendarDays, FileText, LayoutGrid, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoCompact, LogoMark } from "@/components/brand/logo";
import type { AppUser } from "@/components/layout/app-shell";

const navItems = [
  { id: "grupos", href: "/grupos", label: "Grupos", icon: LayoutGrid },
  { id: "estudiantes", href: "/estudiantes", label: "Estudiantes", icon: Users },
  { id: "horarios", href: "/horarios", label: "Horarios", icon: CalendarDays },
  { id: "reportes", href: "/reportes", label: "Reportes", icon: FileText },
];

/**
 * Navigation + identity for the teacher dashboard. Not wrapped in an `<aside>`
 * so the shell can place it in the desktop rail or the mobile drawer. Supports
 * the same collapsed rail as the admin (icon-only with tooltips).
 */
export function Sidebar({ user, collapsed }: { user: AppUser | null; collapsed: boolean }) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col">
      <div
        className={cn(
          "flex h-16 shrink-0 items-center border-b border-border",
          collapsed ? "justify-center px-2" : "px-4",
        )}
      >
        <Link href="/grupos" className="transition-opacity hover:opacity-85" aria-label="Weeon School">
          {collapsed ? <LogoMark /> : <LogoCompact />}
        </Link>
      </div>

      <nav
        className={cn(
          "flex flex-1 flex-col gap-1 overflow-y-auto",
          collapsed ? "items-center px-2 py-3" : "p-4",
        )}
        aria-label="Navegación principal"
      >
        {!collapsed ? (
          <div className="mb-2 px-3 text-[10px] font-bold uppercase tracking-widest text-foreground/40">
            Docentes
          </div>
        ) : null}

        {navItems.map(({ id, href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={id}
              href={href}
              title={collapsed ? label : undefined}
              aria-label={collapsed ? label : undefined}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "group relative flex items-center rounded-xl text-sm font-semibold transition-all",
                collapsed ? "h-10 w-10 justify-center" : "gap-3 px-3 py-2.5",
                isActive
                  ? collapsed
                    ? "text-foreground"
                    : "bg-brand-50/80 text-brand-700 dark:bg-brand-950/50 dark:text-brand-300"
                  : "text-foreground/70 hover:bg-surface-muted hover:text-foreground",
              )}
            >
              {isActive && !collapsed ? (
                <span
                  aria-hidden
                  className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full brand-gradient"
                />
              ) : null}
              <span
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
                  isActive
                    ? "bg-brand-100 text-brand-600 shadow-[inset_0_0_0_1px] shadow-brand-200/60 dark:bg-brand-900/50 dark:text-brand-300 dark:shadow-brand-900/40"
                    : "bg-surface-muted text-foreground/50 group-hover:bg-surface-elevated group-hover:text-foreground/70",
                )}
              >
                <Icon className="h-4 w-4" />
              </span>
              {!collapsed ? label : null}
            </Link>
          );
        })}
      </nav>

      {user ? (
        <div className={cn("border-t border-border", collapsed ? "p-2" : "p-4")}>
          <div className={cn("flex items-center", collapsed ? "flex-col gap-2" : "gap-3")}>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full brand-gradient text-xs font-bold text-white">
              {initialsOf(user.name)}
            </div>
            {!collapsed ? (
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">{user.name}</p>
                <p className="truncate text-xs text-foreground/50">
                  {user.tenantName ?? (user.role === "admin" ? "Administración" : "Docente")}
                </p>
              </div>
            ) : null}
          </div>
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
