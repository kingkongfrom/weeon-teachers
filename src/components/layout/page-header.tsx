import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { getT } from "@/lib/i18n/server";
import type { ReactNode } from "react";

/**
 * In-page back link. The way home lives with the page content, not in the top
 * bar. Reused by pages that render their own banner instead of a PageHeader.
 */
export function BackLink({
  href,
  label,
  className,
}: {
  href: string;
  label: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex w-fit items-center gap-1.5 text-sm font-medium text-foreground/55 transition-colors hover:text-brand-700 hover:underline dark:hover:text-brand-300",
        className,
      )}
    >
      <ArrowLeft className="h-4 w-4" />
      {label}
    </Link>
  );
}

type PageHeaderProps = {
  title: string;
  description?: ReactNode;
  /** When set, a back link is rendered above the title (the way home). */
  backHref?: string;
  backLabel?: string;
  className?: string;
};

/**
 * Standard page heading. The back path (when given) sits with the heading,
 * keeping the top bar limited to the brand and account controls.
 */
export async function PageHeader({
  title,
  description,
  backHref,
  backLabel,
  className,
}: PageHeaderProps) {
  const t = await getT();
  const label = backLabel ?? t.common.home;
  return (
    <header className={cn("flex flex-col gap-1", className)}>
      {backHref ? <BackLink href={backHref} label={label} className="mb-1" /> : null}
      <h1 className="brand-page-title text-3xl text-foreground sm:text-4xl">{title}</h1>
      {description ? (
        <p className="text-sm font-medium text-foreground/55">{description}</p>
      ) : null}
    </header>
  );
}
