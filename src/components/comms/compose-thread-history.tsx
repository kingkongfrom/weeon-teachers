"use client";

import { RichTextView } from "@/components/comms/rich-text";
import { formatComposeLongSent } from "@/lib/comms/compose-display-utils";
import type { ComposeThreadHistoryMessage } from "@/lib/comms/message-draft";
import { useT } from "@/lib/i18n/use-i18n";

function HistoryMetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[5.5rem_1fr] gap-x-3 gap-y-0.5 text-sm leading-snug sm:grid-cols-[6rem_1fr]">
      <span className="font-semibold text-foreground/50">{label}</span>
      <span className="min-w-0 break-words text-foreground/85">{value}</span>
    </div>
  );
}

/** Quoted thread below the editor (flat — no outer box). */
export function ComposeThreadHistory({ messages }: { messages: ComposeThreadHistoryMessage[] }) {
  const t = useT();
  if (messages.length === 0) return null;

  return (
    <div className="mt-10 space-y-10 border-t border-border/60 pt-8">
      <p className="text-sm font-medium text-foreground/45">{t("comms.quotedThread")}:</p>
      {messages.map((message, index) => (
        <article key={message.id} className={index > 0 ? "space-y-4" : "space-y-4"}>
          <div className="space-y-2">
            <HistoryMetaRow label={t("comms.historyFrom")} value={message.fromLabel} />
            <HistoryMetaRow label={t("comms.toLabel")} value={message.toLabel} />
            <HistoryMetaRow label={t("comms.historySent")} value={formatComposeLongSent(message.sentAt)} />
            <HistoryMetaRow label={t("comms.subject")} value={message.subject} />
          </div>
          <div className="border-l-[3px] border-foreground/12 pl-5 text-sm leading-relaxed text-foreground/80">
            <RichTextView doc={message.body} />
          </div>
        </article>
      ))}
    </div>
  );
}
