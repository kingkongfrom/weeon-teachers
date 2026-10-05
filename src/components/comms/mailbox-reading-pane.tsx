"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, MoreHorizontal, Reply } from "lucide-react";
import { RichTextView } from "@/components/comms/rich-text";
import { COMMS_MESSAGES } from "@/lib/comms/paths";
import { fetchThreadDetail, markThreadRead } from "@/lib/teachers/comms-actions";
import type { MessageThreadDetail, MessageThreadSummary } from "@/lib/dashboard/messages";
import { useT } from "@/lib/i18n/use-i18n";

const threadDetailCache = new Map<string, MessageThreadDetail>();

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

export function MailboxReadingPane({
  threadId,
  listSummary,
  onThreadRead,
}: {
  threadId: string | null;
  listSummary?: MessageThreadSummary | null;
  onThreadRead?: (threadId: string) => void;
}) {
  const t = useT();
  const [detail, setDetail] = useState<MessageThreadDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!threadId) {
      setDetail(null);
      return;
    }
    if (listSummary?.unread) {
      void markThreadRead(threadId).then((res) => {
        if (res.ok) onThreadRead?.(threadId);
      });
    }
    const cached = threadDetailCache.get(threadId);
    if (cached) {
      setDetail(cached);
      setLoading(false);
    } else {
      setLoading(true);
    }
    let cancelled = false;
    void fetchThreadDetail(threadId).then((result) => {
      if (cancelled) return;
      if (result) {
        const unread = result.summary.unread || listSummary?.unread;
        if (unread) {
          threadDetailCache.set(threadId, {
            ...result,
            summary: { ...result.summary, unread: false },
          });
        } else {
          threadDetailCache.set(threadId, result);
        }
      }
      setDetail(result ? threadDetailCache.get(threadId) ?? result : null);
      setLoading(false);
      const shouldMark = result?.summary.unread || listSummary?.unread;
      if (shouldMark) {
        void markThreadRead(threadId).then((res) => {
          if (res.ok) onThreadRead?.(threadId);
        });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [threadId, listSummary?.unread, onThreadRead]);

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

  const headerSubject = detail?.summary.subject ?? listSummary?.subject ?? "";
  const headerCounterpart =
    detail?.summary.counterpart ?? listSummary?.counterpart ?? "";
  const waitingForDetail = loading && (!detail || detail.summary.id !== threadId);

  if (waitingForDetail && !listSummary) {
    return (
      <div className="flex min-w-[24rem] flex-1 items-center justify-center text-foreground/40">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (!detail || detail.summary.id !== threadId) {
    if (!listSummary) {
      return (
        <div className="flex min-w-[24rem] flex-1 items-center justify-center text-foreground/40">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      );
    }
    return (
      <article className="min-w-[24rem] flex-1 overflow-y-auto px-6 py-5">
        <div className="flex items-start gap-3">
          <h2 className="min-w-0 flex-1 text-xl font-semibold text-foreground">{headerSubject}</h2>
          {waitingForDetail ? (
            <Loader2 className="h-5 w-5 shrink-0 animate-spin text-foreground/35" />
          ) : null}
        </div>
        <p className="mt-4 text-sm text-foreground/55">{headerCounterpart}</p>
        <p className="mt-2 text-sm text-foreground/70">{listSummary.preview}</p>
      </article>
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
          {detail.summary.allowReplies ? (
            <Link
              href={`${COMMS_MESSAGES}/${detail.summary.id}`}
              aria-label={t("comms.replySection")}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-surface-muted hover:text-foreground"
            >
              <Reply className="h-4 w-4" />
            </Link>
          ) : null}
          <Link
            href={`${COMMS_MESSAGES}/${detail.summary.id}`}
            aria-label={t("comms.openFullThread")}
            title={t("comms.openFullThread")}
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
