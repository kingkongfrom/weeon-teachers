import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { UnreadCountBadge } from "@/components/comms/unread-count-badge";
import { hubTonePill, TONE_AVATAR, type Tone } from "@/lib/dashboard/tones";
import { cn } from "@/lib/utils";

/** Matches the mobile home diamond (`GRID_CENTER_DIAMOND_SLOT` = 1.14× a cell). */
const DIAMOND_SLOT = 1.14;

export type HubQuincunxItem = {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  /** Shared hub tone — same chips as the other teacher hubs and the schedule. */
  tone: Tone;
  badgeCount?: number;
};

function TileContent({
  item,
  wellClassName,
  iconClassName,
  labelClassName,
  labelBoxClassName,
}: {
  item: HubQuincunxItem;
  wellClassName: string;
  iconClassName: string;
  labelClassName: string;
  /** Same height on every corner so icons in a row share one line. */
  labelBoxClassName: string;
}) {
  const Icon = item.icon;
  const pill = hubTonePill(item.tone);
  return (
    <>
      <span
        className={cn(
          "relative flex shrink-0 items-center justify-center text-white",
          TONE_AVATAR[item.tone],
          wellClassName,
        )}
      >
        <Icon className={iconClassName} strokeWidth={2.1} />
        {item.badgeCount && item.badgeCount > 0 ? (
          <UnreadCountBadge count={item.badgeCount} absolute />
        ) : null}
      </span>
      <span
        className={cn("flex w-full items-start justify-center text-balance", labelBoxClassName)}
      >
        <span className={cn(labelClassName, pill.label)}>{item.label}</span>
      </span>
    </>
  );
}

/**
 * Four fused squares and one center diamond (mobile home quincunx) on the light surface.
 * `corners` is row-major: top-left, top-right, bottom-left, bottom-right.
 */
export function HubQuincunxGrid({
  corners,
  center,
}: {
  corners: readonly [HubQuincunxItem, HubQuincunxItem, HubQuincunxItem, HubQuincunxItem];
  center: HubQuincunxItem;
}) {
  const diamondPct = (DIAMOND_SLOT / 2) * 100;
  const diamondInset = (100 - diamondPct) / 2;

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[34rem]">
      <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 overflow-hidden rounded-[1.75rem] bg-surface shadow-sm ring-1 ring-border/80">
        {corners.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className={cn(
              "flex items-center justify-center px-4 transition-colors hover:brightness-[0.98]",
              hubTonePill(item.tone).fill,
            )}
          >
            <span className="flex w-full max-w-[11rem] flex-col items-center gap-2.5 text-center">
              <TileContent
                item={item}
                wellClassName="h-12 w-12 rounded-2xl sm:h-14 sm:w-14"
                iconClassName="h-6 w-6 sm:h-7 sm:w-7"
                labelBoxClassName="min-h-[2.5rem]"
                labelClassName="text-sm font-semibold leading-tight sm:text-[15px]"
              />
            </span>
          </Link>
        ))}
      </div>

      <Link
        href={center.href}
        aria-label={center.label}
        className={cn(
          "absolute z-10 flex items-center justify-center transition-colors hover:brightness-[0.98]",
          hubTonePill(center.tone).fill,
        )}
        style={{
          left: `${diamondInset}%`,
          top: `${diamondInset}%`,
          width: `${diamondPct}%`,
          height: `${diamondPct}%`,
          clipPath: "polygon(50% 0, 100% 50%, 50% 100%, 0 50%)",
        }}
      >
        <span className="flex w-[6.5rem] flex-col items-center gap-2.5 text-center">
          <TileContent
            item={center}
            wellClassName="h-12 w-12 rounded-2xl sm:h-14 sm:w-14"
            iconClassName="h-6 w-6 sm:h-7 sm:w-7"
            labelBoxClassName="min-h-[1.25rem]"
            labelClassName="text-sm font-semibold leading-tight sm:text-[15px]"
          />
        </span>
      </Link>

      <svg
        className="pointer-events-none absolute inset-0 z-20 text-border"
        viewBox="0 0 200 200"
        aria-hidden
      >
        <g stroke="currentColor" strokeWidth="0.7" strokeLinecap="round" fill="none">
          <line x1="0" y1="100" x2="43" y2="100" />
          <line x1="157" y1="100" x2="200" y2="100" />
          <line x1="100" y1="0" x2="100" y2="43" />
          <line x1="100" y1="157" x2="100" y2="200" />
          <polygon points="100,43 157,100 100,157 43,100" strokeLinejoin="round" />
        </g>
      </svg>
    </div>
  );
}
