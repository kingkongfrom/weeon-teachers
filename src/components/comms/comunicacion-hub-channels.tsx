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
    <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
      {channels.map((channel) => {
        const pill = hubTonePill(channel.tone);
        const Icon = channel.icon;
        return (
          <Link
            key={channel.id}
            href={channel.href}
            className={cn(
              "group flex items-center gap-2.5 rounded-2xl border border-border bg-surface p-3 transition-all sm:gap-4 sm:p-5",
              pill.active,
              "hover:opacity-95 active:scale-[0.995]",
            )}
          >
            <span
              className={cn(
                "relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-sm sm:h-12 sm:w-12 sm:rounded-2xl",
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
              <span className={cn("block text-sm font-bold sm:text-lg", pill.label)}>
                {channel.title}
              </span>
              <span className="mt-0.5 line-clamp-2 text-xs font-medium leading-snug text-foreground/55 sm:line-clamp-1 sm:truncate sm:text-sm">
                {channel.hint}
              </span>
            </span>
            {channel.statLabel ? (
              <span
                className={cn(
                  "hidden min-[380px]:inline-flex shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold sm:px-2.5 sm:py-1 sm:text-xs",
                  pill.countOnActive,
                )}
              >
                {channel.statLabel}
              </span>
            ) : null}
            <ChevronRight
              className="hidden h-5 w-5 shrink-0 text-foreground/30 transition-transform group-hover:translate-x-0.5 group-hover:text-foreground/50 min-[380px]:block"
              aria-hidden
            />
          </Link>
        );
      })}
    </div>
  );
}
