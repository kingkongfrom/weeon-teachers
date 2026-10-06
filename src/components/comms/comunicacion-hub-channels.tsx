import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ChevronRight } from "lucide-react";
import { UnreadCountBadge } from "@/components/comms/unread-count-badge";
import { cn } from "@/lib/utils";
import { hubTonePill, TONE_AVATAR, type HubTone } from "@/lib/dashboard/tones";

export type ComunicacionHubChannel = {
  id: string;
  href: string;
  icon: LucideIcon;
  title: string;
  hint: string;
  tone: HubTone;
  badgeCount: number;
  statLabel?: string;
};

/** Full-width horizontal entry points — reads like a control deck, not floating tiles. */
export function ComunicacionHubChannels({ channels }: { channels: ComunicacionHubChannel[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
      {channels.map((channel) => {
        const pill = hubTonePill(channel.tone);
        const Icon = channel.icon;
        return (
          <Link
            key={channel.id}
            href={channel.href}
            className={cn(
              "group flex items-center gap-4 rounded-2xl border border-border bg-surface p-4 transition-all sm:p-5",
              pill.active,
              "hover:opacity-95 active:scale-[0.995]",
            )}
          >
            <span
              className={cn(
                "relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white shadow-sm",
                TONE_AVATAR[channel.tone],
              )}
              aria-hidden
            >
              <Icon className="h-5 w-5" strokeWidth={2.2} />
              {channel.badgeCount > 0 ? (
                <UnreadCountBadge count={channel.badgeCount} absolute />
              ) : null}
            </span>
            <span className="min-w-0 flex-1">
              <span className={cn("block text-base font-bold sm:text-lg", pill.label)}>
                {channel.title}
              </span>
              <span className="mt-0.5 block truncate text-sm font-medium text-foreground/55">
                {channel.hint}
              </span>
            </span>
            {channel.statLabel ? (
              <span
                className={cn(
                  "hidden shrink-0 rounded-full px-2.5 py-1 text-xs font-bold sm:inline-flex",
                  pill.countOnActive,
                )}
              >
                {channel.statLabel}
              </span>
            ) : null}
            <ChevronRight
              className="h-5 w-5 shrink-0 text-foreground/30 transition-transform group-hover:translate-x-0.5 group-hover:text-foreground/50"
              aria-hidden
            />
          </Link>
        );
      })}
    </div>
  );
}
