"use client";

import { Paperclip } from "lucide-react";
import { PdfFileButton } from "@/components/ui/pdf-reader";
import { RichTextView } from "@/components/comms/rich-text";
import type {
  MessageAttachment,
  MessageItem,
  MessageRecipient,
} from "@/lib/dashboard/messages";
import {
  formatComposeLongSent,
} from "@/lib/comms/compose-display-utils";
import { cn } from "@/lib/utils";
import { useLiveT } from "@/lib/i18n/use-i18n";

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-1.5 text-[12px] leading-tight text-foreground/60">
      <span className="shrink-0 font-medium text-foreground/45">{label}</span>
      <span className="min-w-0 break-words font-semibold text-foreground/85">{value}</span>
    </div>
  );
}

/** Read-only thread in the mailbox pane — every message visible (newest first). */
export function ThreadMessageHistory({
  messages,
  toLabel,
  subject,
  recipients,
  showReadReceipts,
  attachments,
  readOnly = false,
}: {
  threadId?: string;
  messages: MessageItem[];
  toLabel: string;
  subject?: string;
  recipients: MessageRecipient[];
  showReadReceipts: boolean;
  attachments: MessageAttachment[];
  allowReplies?: boolean;
  readOnly?: boolean;
}) {
  const t = useLiveT();

  if (messages.length === 0) {
    return (
      <p className="text-sm text-foreground/50">{t("comms.emptyMessagesBody")}</p>
    );
  }
  const ordered = [...messages].reverse();

  return (
    <div className={cn("pb-4", !readOnly && "pb-4")}>
      {attachments.length > 0 ? (
        <div className="mb-3 flex flex-wrap gap-2">
          <span className="w-full text-xs font-semibold text-foreground/50">
            {t("comms.attachments")}
          </span>
          {/*
            IN-APP PREVIEW, not a link to the browser.
            These used to be plain <a target="_blank">, so every attachment — PDFs
            included — was handed to the browser to open in a tab or download.
            PdfFileButton renders PDFs and images inside the app; only formats with
            no viewer (office, zip) still open externally, and they say so.
          */}
          {attachments.map((attachment) => (
            <PdfFileButton
              key={attachment.id}
              url={attachment.url}
              name={attachment.name}
              mimeType={attachment.mimeType}
              className="inline-flex max-w-full items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-foreground/80 transition-colors hover:bg-surface-muted"
            >
              <Paperclip className="h-3.5 w-3.5 shrink-0 text-foreground/45" />
              <span className="truncate">{attachment.name}</span>
            </PdfFileButton>
          ))}
        </div>
      ) : null}

      <div className="space-y-10">
        {ordered.map((message, index) => {
          const authorName = message.mine
            ? t("comms.you")
            : message.authorName || t("comms.authorFallback");
          const isLatest = index === 0;
          const sectionLabel =
            index === ordered.length - 1
              ? t("comms.threadSectionInitial")
              : t("comms.threadSectionReply");

          return (
            <article
              key={message.id}
              className={cn(!isLatest && "border-t border-border/60 pt-8")}
            >
              {!isLatest ? (
                <p className="mb-4 text-sm font-medium text-foreground/45">{sectionLabel}:</p>
              ) : null}
              <header className="space-y-0.5">
                <MetaRow label={t("comms.historyFrom")} value={authorName} />
                <MetaRow label={t("comms.toLabel")} value={toLabel} />
                <MetaRow
                  label={t("comms.historySent")}
                  value={formatComposeLongSent(message.createdAt)}
                />
                {/*
                  NO "Asunto:" ROW. It repeated the subject already shown as the
                  reading pane's title directly above, so on a phone it spent a
                  whole line of a four-line block restating what was visible
                  inches higher. From/To/Sent are the facts not shown elsewhere.
                */}
              </header>
              <div className="mt-3 border-t border-border/70 pt-3 text-sm leading-relaxed text-foreground/90">
                <RichTextView doc={message.body} />
              </div>
            </article>
          );
        })}
      </div>

      {/*
        NO "WHO READ IT" LIST ON A MESSAGE.

        The owner finds per-message read tracking invasive — a recipient seeing
        that the sender knows the instant they opened it — and the list itself was
        never acted on. Hidden here only: `read_at` is still recorded, because it
        drives the unread state and the inbox counts, so removing the write would
        break those.

        CIRCULARS ARE UNCHANGED. `circular-detail-view.tsx` keeps its list: who
        opened an official circular is an audit record, not a receipt.
      */}
    </div>
  );
}
