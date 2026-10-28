"use client";

import { Forward, Reply, ReplyAll } from "lucide-react";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useLiveT } from "@/lib/i18n/use-i18n";

const iconClass =
  "h-[1.5rem] w-[1.5rem] shrink-0 stroke-[2.25] text-[#5e25cc] dark:text-[#a78bfa]";

const chipBtn =
  "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-surface-muted/40 text-foreground/80 transition-colors hover:border-border hover:bg-surface-muted hover:text-foreground";

/** Reply / Reply all / Forward — icon chips (Outlook-style toolbar). */
export function ComposeActionBar({
  onReply,
  onReplyAll,
  onForward,
  className,
}: {
  onReply: () => void;
  onReplyAll: () => void;
  onForward: () => void;
  className?: string;
}) {
  const t = useLiveT();

  return (
    <div className={cn("inline-flex flex-wrap items-center gap-1.5", className)}>
      <Tooltip content={t("comms.replySection")} placement="bottom">
        <button
          type="button"
          onClick={onReply}
          className={chipBtn}
          aria-label={t("comms.replySection")}
        >
          <Reply className={iconClass} aria-hidden />
        </button>
      </Tooltip>
      <Tooltip content={t("comms.replyAll")} placement="bottom">
        <button
          type="button"
          onClick={onReplyAll}
          className={chipBtn}
          aria-label={t("comms.replyAll")}
        >
          <ReplyAll className={iconClass} aria-hidden />
        </button>
      </Tooltip>
      <Tooltip content={t("comms.forward")} placement="bottom">
        <button
          type="button"
          onClick={onForward}
          className={chipBtn}
          aria-label={t("comms.forward")}
        >
          <Forward className={iconClass} aria-hidden />
        </button>
      </Tooltip>
    </div>
  );
}
