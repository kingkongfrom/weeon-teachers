"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Forward, Loader2, MoreHorizontal, Reply } from "lucide-react";
import { RichTextView } from "@/components/comms/rich-text";
import { COMMS_MESSAGES } from "@/lib/comms/paths";
import type { MessageThreadDetail } from "@/lib/dashboard/messages";
import { fetchThreadDetail, markThreadRead } from "@/lib/teachers/comms-actions";
import { useT } from "@/lib/i18n/use-i18n";

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("es-CR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function MailboxReadingPane({ threadId }: { threadId: string | null }) {
  const t = useT();
  const [detail, setDetail] = useState<MessageThreadDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!threadId) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void fetchThreadDetail(threadId).then((result) => {
      if (cancelled) return;
      setDetail(result);
      setLoading(false);
      if (result?.summary.unread) void markThreadRead(threadId);
    });
    return () => {
      cancelled = true;
    };
  }, [threadId]);

  if (!threadId) {
    return (
      <div className="flex min-w-[24rem] flex-1 items-center justify-center px-8 text-center">
        <div>
          <p className="text-sm font-semibold text-foreground">{t("comms.emptyMessages")}</p>
          <p className="mt-1 text-xs font-medium text-foreground/50">{t("comms.emptyMessagesBody")}</p>
        </div>
      </div>
    );
  }

  if (loading || !detail || detail.summary.id !== threadId) {
    return (
      <div className="flex min-w-[24rem] flex-1 items-center justify-center text-foreground/40">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  const latest = detail.messages[detail.messages.length - 1];
  const earlier = detail.messages.slice(0, -1).reverse();
  const authorName = latest
    ? latest.mine
      ? t("comms.you")
      : latest.authorName || detail.summary.counterpart
    : detail.summary.counterpart;
  const toNames = detail.recipients.map((row) => row.name).filter(Boolean);
  const toLabel = toNames.length > 0 ? toNames.join(", ") : detail.summary.counterpart;

  return (
      <article className="min-w-[24rem] flex-1 overflow-y-auto px-6 py-5">
      <div className="flex items-start gap-3">
        <h2 className="min-w-0 flex-1 text-xl font-semibold text-foreground">{detail.summary.subject}</h2>
        <div className="flex shrink-0 items-center gap-1 text-foreground/45">
          <Link
            href={`${COMMS_MESSAGES}/${detail.summary.id}`}
            aria-label={t("comms.replySection")}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-surface-muted hover:text-foreground"
          >
            <Reply className="h-4 w-4" />
          </Link>
          <Link
            href={`${COMMS_MESSAGES}/${detail.summary.id}`}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-surface-muted hover:text-foreground"
          >
            <Forward className="h-4 w-4" />
          </Link>
          <Link
            href={`${COMMS_MESSAGES}/${detail.summary.id}`}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-surface-muted hover:text-foreground"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <div className="mt-5 flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#2563b0] text-sm font-bold text-white">
          {authorName.slice(0, 1).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm font-semibold text-foreground">{authorName}</p>
            <p className="text-xs text-foreground/45">{latest ? formatDate(latest.createdAt) : ""}</p>
          </div>
          <p className="mt-0.5 text-xs text-foreground/55">
            <span className="font-semibold">{t("comms.toLabel")}:</span> {toLabel}
          </p>
        </div>
      </div>

      {latest ? (
        <div className="mt-6 text-sm leading-relaxed text-foreground/90">
          <RichTextView doc={latest.body} />
        </div>
      ) : null}

      {earlier.length > 0 ? (
        <div className="mt-8 space-y-4 border-t border-border pt-4">
          {earlier.map((message) => (
            <div key={message.id} className="rounded-xl bg-surface-muted/50 px-4 py-3">
              <p className="text-xs font-semibold text-foreground/55">
                {message.mine ? t("comms.you") : message.authorName} · {formatDate(message.createdAt)}
              </p>
              <div className="mt-2 text-sm text-foreground/80">
                <RichTextView doc={message.body} />
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </article>
  );
}
