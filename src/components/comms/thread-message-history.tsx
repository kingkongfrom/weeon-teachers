"use client";

import { Paperclip } from "lucide-react";
import { RecipientReadList } from "@/components/comms/recipient-read-list";
import { RichTextView } from "@/components/comms/rich-text";
import type {
  MessageAttachment,
  MessageItem,
  MessageRecipient,
} from "@/lib/dashboard/messages";
import { ChatAvatar } from "@/components/comms/chat-avatar";
import {
  formatComposeLongSent,
} from "@/lib/comms/compose-display-utils";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/use-i18n";

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[5.5rem_1fr] gap-x-3 text-sm leading-snug sm:grid-cols-[6.5rem_1fr]">
      <span className="font-semibold text-foreground/50">{label}</span>
      <span className="min-w-0 break-words font-medium text-foreground/90">{value}</span>
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
  const t = useT();

  if (messages.length === 0) {
    return (
      <p className="text-sm text-foreground/50">{t("comms.emptyMessagesBody")}</p>
    );
  }

  const subjectLine = subject?.trim() || t("comms.draftNoSubject");
  const ordered = [...messages].reverse();

  return (
    <div className={cn("pb-4", !readOnly && "pb-4")}>
      {attachments.length > 0 ? (
        <div className="mb-5 flex flex-wrap gap-2 border-b border-border pb-4">
          <span className="w-full text-xs font-semibold text-foreground/50">
            {t("comms.attachments")}
          </span>
          {attachments.map((attachment) => (
            <a
              key={attachment.id}
              href={attachment.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex max-w-full items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground/80 transition-colors hover:bg-surface-muted"
            >
              <Paperclip className="h-3.5 w-3.5 shrink-0 text-foreground/45" />
              <span className="truncate">{attachment.name}</span>
            </a>
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
              <header className="flex items-start gap-3">
                <ChatAvatar
                  name={authorName}
                  imageUrl={message.avatarUrl}
                  className="h-11 w-11 text-[16px]"
                />
                <div className="min-w-0 flex-1 space-y-3">
                  <MetaRow label={t("comms.historyFrom")} value={authorName} />
                  <MetaRow label={t("comms.toLabel")} value={toLabel} />
                  <MetaRow
                    label={t("comms.historySent")}
                    value={formatComposeLongSent(message.createdAt)}
                  />
                  <MetaRow label={t("comms.subject")} value={subjectLine} />
                </div>
              </header>
              <div className="mt-4 border-l-[3px] border-foreground/12 pl-5 text-sm leading-relaxed text-foreground/90">
                <RichTextView doc={message.body} />
              </div>
            </article>
          );
        })}
      </div>

      {showReadReceipts && recipients.length > 0 ? (
        <RecipientReadList recipients={recipients} />
      ) : null}
    </div>
  );
}
