import Link from "next/link";
import { ChevronRight, type LucideIcon } from "lucide-react";
import { UnreadCountBadge } from "@/components/comms/unread-count-badge";
import { cn } from "@/lib/utils";
import { hubTonePill, TONE_AVATAR, type HubTone } from "@/lib/dashboard/tones";

type HubModuleCardProps = {
  tone: HubTone;
  icon: LucideIcon;
  title: string;
  description: string;
  /** Footer metric (e.g. "3 clases"). */
  stat?: string;
  /** Shown when the module is not linked yet. */
  upcomingLabel?: string;
  /** Unread badge on the icon (Comunicación hub tiles). */
  badgeCount?: number;
  /** Square tile for two-column hubs. Lead is the wide primary row. */
  layout?: "default" | "square" | "lead";
  href?: string;
  className?: string;
};

/** Hub shortcut tile — white card, flat chip, colored title, thin tone ring. */
export function HubModuleCard({
  tone,
  icon: Icon,
  title,
  description,
  stat,
  upcomingLabel,
  badgeCount = 0,
  layout = "default",
  href,
  className,
}: HubModuleCardProps) {
  const pill = hubTonePill(tone);
  const square = layout === "square";
  const lead = layout === "lead";

  const card = (
    <div
      className={cn(
        "rounded-3xl border border-border p-5 transition-all",
        lead
          ? "flex min-h-[7.5rem] items-center gap-4 sm:gap-5 sm:p-6"
          : "flex h-full flex-col gap-2.5 sm:gap-3",
        !lead && (square ? "aspect-square min-h-0 justify-between" : "min-h-[8.5rem] sm:min-h-[9rem]"),
        pill.active,
        href ? "hover:opacity-95 active:scale-[0.99]" : "",
        className,
      )}
    >
      <span
        className={cn(
          "relative flex shrink-0 items-center justify-center rounded-full text-white",
          lead ? "h-14 w-14" : "h-11 w-11",
          TONE_AVATAR[tone],
        )}
        aria-hidden
      >
        <Icon className={lead ? "h-7 w-7" : "h-5 w-5"} strokeWidth={2.2} />
        {badgeCount > 0 ? <UnreadCountBadge count={badgeCount} absolute /> : null}
      </span>

      <div className={cn("min-w-0", lead ? "flex-1" : square ? "flex flex-1 flex-col justify-end" : "mt-auto")}>
        <h2 className={cn("font-bold leading-snug", lead ? "text-xl sm:text-2xl" : "text-base sm:text-lg", pill.label)}>{title}</h2>
        <p
          className={cn(
            "mt-0.5 text-sm font-medium leading-snug text-foreground/55",
            square && "line-clamp-4",
          )}
        >
          {description}
        </p>
        {stat ? (
          <p className={cn("mt-2 text-xs font-semibold opacity-75", pill.label)}>{stat}</p>
        ) : upcomingLabel ? (
          <span className="mt-3 inline-flex rounded-full border border-black/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide dark:border-white/20">
            {upcomingLabel}
          </span>
        ) : null}
      </div>
      {lead && href ? (
        <ChevronRight className={cn("h-5 w-5 shrink-0", pill.label)} aria-hidden />
      ) : null}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="group block h-full">
        {card}
      </Link>
    );
  }

  return card;
}
