"use client";

import { useMemo } from "react";
import { X } from "lucide-react";
import { Tooltip } from "@/components/ui/tooltip";
import type { PickerSelection } from "@/components/comms/recipient-picker-modal";
import { splitVisibleParaRecipients } from "@/lib/comms/compose-recipient-display";
import { isPresenceLookupKey } from "@/lib/comms/presence-key-resolve";
import { presenceDotClass, type PresenceStatus } from "@/lib/comms/presence-status";
import { useProfilePresence } from "@/lib/comms/use-profile-presence";
import type { RealtimeConfig } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";
import { useLiveT } from "@/lib/i18n/use-i18n";
import type { CommsMessageKey } from "@/lib/i18n/comms-messages";

function presenceTitle(status: PresenceStatus, t: (key: CommsMessageKey) => string): string {
  if (status === "online") return t("comms.presenceOnline");
  if (status === "away") return t("comms.presenceAway");
  if (status === "offline") return t("comms.presenceOffline");
  return t("comms.presenceUnknown");
}

export function ParaRecipientInlineList({
  selections,
  onShowAll,
  onRemoveKey,
  realtime = null,
  className,
}: {
  selections: PickerSelection[];
  onShowAll?: () => void;
  /** Remove one Para row by flattened display key. */
  onRemoveKey?: (key: string) => void;
  realtime?: RealtimeConfig | null;
  className?: string;
}) {
  const t = useLiveT();
  const { visible, hiddenCount } = splitVisibleParaRecipients(selections);
  const profileIds = useMemo(
    () =>
      visible
        .map((entry) => entry.key)
        .filter(isPresenceLookupKey),
    [selections],
  );
  const presenceByProfile = useProfilePresence(profileIds, realtime);

  if (visible.length === 0) return null;

  return (
    <div className={cn("flex min-w-0 flex-1 flex-wrap items-center gap-1.5", className)}>
      {visible.map((entry) => {
        const status = isPresenceLookupKey(entry.key)
          ? (presenceByProfile.get(entry.key) ?? "unknown")
          : "unknown";
        return (
          <span
            key={entry.key}
            className="inline-flex max-w-full items-center gap-1 rounded-md bg-surface py-0.5 pl-1.5 pr-0.5 ring-1 ring-border/60"
          >
            <Tooltip content={presenceTitle(status, t)} placement="top">
              <span
                className={cn("inline-flex h-2 w-2 shrink-0 rounded-full", presenceDotClass(status))}
                aria-label={presenceTitle(status, t)}
              />
            </Tooltip>
            <span className="max-w-[12rem] truncate text-xs font-medium text-foreground/85 sm:max-w-[16rem]">
              {entry.name}
            </span>
            {onRemoveKey ? (
              <button
                type="button"
                onClick={() => onRemoveKey(entry.key)}
                className="rounded p-0.5 text-foreground/40 hover:bg-error/10 hover:text-error"
                aria-label={t("comms.removeRecipient")}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </span>
        );
      })}
      {hiddenCount > 0 ? (
        <button
          type="button"
          onClick={onShowAll}
          className="shrink-0 text-xs font-semibold text-foreground/55 hover:text-foreground"
        >
          {t("comms.recipientsOthers", { n: hiddenCount })}
        </button>
      ) : null}
    </div>
  );
}
