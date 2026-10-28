"use client";

import { useCallback, useEffect, useState, type KeyboardEvent, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Mail } from "lucide-react";
import { ThreadMessageHistory } from "@/components/comms/thread-message-history";
import { formatThreadRecipientsLine } from "@/lib/comms/recipient-display-summary";
import { COMMS_COMPOSE, COMMS_MESSAGES } from "@/lib/comms/paths";
import {
  MailboxThreadToolbar,
  type MailboxThreadToolbarProps,
} from "@/components/comms/mailbox-thread-toolbar";
import { useThreadDetailRealtime } from "@/lib/comms/mail-realtime";
import {
  getCachedThreadDetail,
  invalidateThreadDetailCache,
  setCachedThreadDetail,
} from "@/lib/comms/thread-detail-cache";
import { fetchThreadDetail, markThreadRead } from "@/lib/teachers/comms-actions";
import type { MessageThreadDetail, MessageThreadSummary } from "@/lib/dashboard/messages";
import type { RealtimeConfig } from "@/lib/supabase/browser";
import { Tooltip } from "@/components/ui/tooltip";
import { useLiveT } from "@/lib/i18n/use-i18n";

const readPaneHeaderClass =
  "sticky top-0 z-10 flex items-start gap-2 border-b border-border bg-surface/95 px-4 pt-4 pb-3 backdrop-blur-sm sm:px-5 sm:pt-5 sm:pb-3.5";

export function MailboxReadingPane({
  threadId,
  listSummary,
  onThreadRead,
  toolbar,
  realtime = null,
}: {
  threadId: string | null;
  listSummary?: MessageThreadSummary | null;
  onThreadRead?: (threadId: string) => void;
  toolbar?: MailboxThreadToolbarProps | null;
  realtime?: RealtimeConfig | null;
}) {
  const t = useLiveT();
  const router = useRouter();
  const [detail, setDetail] = useState<MessageThreadDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  const openRedactar = useCallback(() => {
    if (!threadId) return;
    router.push(`${COMMS_COMPOSE}?thread=${threadId}`);
  }, [router, threadId]);

  const loadDetail = useCallback(
    async (id: string, force = false) => {
      if (!force) {
        const cached = getCachedThreadDetail(id);
        if (cached) {
          setDetail(cached);
          setLoading(false);
          return;
        }
      } else {
        invalidateThreadDetailCache(id);
      }
      setLoading(true);
      const result = await fetchThreadDetail(id);
      if (!result) {
        setDetail(null);
        setLoading(false);
        return;
      }
      const unread = result.summary.unread || listSummary?.unread;
      const normalized = unread
        ? { ...result, summary: { ...result.summary, unread: false } }
        : result;
      setCachedThreadDetail(id, normalized);
      setDetail(normalized);
      setLoading(false);
      if (unread) {
        void markThreadRead(id).then((res) => {
          if (res.ok) onThreadRead?.(id);
        });
      }
    },
    [listSummary?.unread, onThreadRead],
  );

  const bumpThread = useCallback(() => {
    if (!threadId) return;
    invalidateThreadDetailCache(threadId);
    setReloadToken((value) => value + 1);
  }, [threadId]);

  useThreadDetailRealtime(realtime, threadId, bumpThread);

  useEffect(() => {
    if (!threadId) {
      setDetail(null);
      return;
    }
    void loadDetail(threadId, false);
  }, [threadId, loadDetail]);

  useEffect(() => {
    if (!threadId || reloadToken === 0) return;
    void loadDetail(threadId, true);
  }, [reloadToken, threadId, loadDetail]);

  function bodyActivate(event: MouseEvent<HTMLElement> | KeyboardEvent<HTMLElement>) {
    const target = event.target as HTMLElement;
    if (target.closest("a, button, input, textarea, [role='switch']")) return;
    openRedactar();
  }

  if (!threadId) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center bg-surface-muted/30 px-6 text-center">
        <div>
          <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-surface text-foreground/35 shadow-sm">
            <Mail className="h-6 w-6" aria-hidden />
          </span>
          <p className="text-sm font-semibold text-foreground">{t("comms.emptyMessages")}</p>
          <p className="mt-1 text-xs text-foreground/50">{t("comms.selectMessagePrompt")}</p>
        </div>
      </div>
    );
  }

  const headerSubject = detail?.summary.subject ?? listSummary?.subject ?? "";
  const waitingForDetail = loading && (!detail || detail.summary.id !== threadId);
  const fullThreadHref = `${COMMS_MESSAGES}/${threadId}`;
  const openHint = t("comms.openMessageInComposer");

  if (waitingForDetail && !listSummary) {
    return (
      <div className="flex min-w-0 flex-1 items-center justify-center text-foreground/40">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!detail || detail.summary.id !== threadId) {
    if (!listSummary) {
      return (
        <div className="flex min-w-0 flex-1 items-center justify-center text-foreground/40">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      );
    }
    return (
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className={readPaneHeaderClass}>
          <h2 className="min-w-0 flex-1 text-lg font-semibold text-foreground">{headerSubject}</h2>
          {toolbar ? (
            <MailboxThreadToolbar
              {...toolbar}
              threadId={threadId}
              allowReplies={listSummary.allowReplies ?? false}
              fullThreadHref={fullThreadHref}
            />
          ) : null}
        </header>
        <article className="flex-1 overflow-y-auto px-4 py-5 sm:px-5">
          {waitingForDetail ? (
            <Loader2 className="h-5 w-5 animate-spin text-foreground/35" />
          ) : (
            <Tooltip content={openHint} placement="bottom" className="w-full">
              <button
                type="button"
                onClick={bodyActivate}
                className="w-full cursor-pointer rounded-xl px-2 py-3 text-left text-sm text-foreground/70 transition-colors hover:bg-surface-muted/50"
              >
                {listSummary.preview}
              </button>
            </Tooltip>
          )}
        </article>
      </div>
    );
  }

  const toNames = detail.recipients.map((row) => row.name).filter(Boolean);
  const toLabel = formatThreadRecipientsLine(toNames, detail.summary.counterpart);

  return (
    <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
      <header className={readPaneHeaderClass}>
        <h2 className="min-w-0 flex-1 text-base font-semibold leading-snug text-foreground sm:text-lg">
          {detail.summary.subject}
        </h2>
        {toolbar ? (
          <MailboxThreadToolbar
            {...toolbar}
            threadId={threadId}
            allowReplies={detail.summary.allowReplies}
            fullThreadHref={fullThreadHref}
          />
        ) : null}
      </header>

      <Tooltip
        content={openHint}
        placement="bottom"
        className="flex min-h-0 min-w-0 flex-1 flex-col"
      >
        <article
          className="flex-1 cursor-pointer overflow-y-auto px-4 py-5 sm:px-5 hover:bg-surface-muted/20"
          onClick={bodyActivate}
        >
          <ThreadMessageHistory
            messages={detail.messages}
            subject={detail.summary.subject}
            toLabel={toLabel}
            recipients={detail.recipients}
            showReadReceipts={detail.summary.mine}
            attachments={detail.attachments}
            allowReplies={detail.summary.allowReplies}
            readOnly
          />
        </article>
      </Tooltip>
    </div>
  );
}
