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

/*
 * PHONES: THE SUBJECT GETS ITS OWN ROW.
 *
 * Title and actions shared one flex row, so every icon (reply, star, delete,
 * menu) took width from the subject — on a phone it was squeezed to whatever was
 * left, often one or two words. Adding Forward later would squeeze it further.
 *
 * Below `sm` the title claims a full line (`basis-full`), pushing the actions
 * onto their own right-aligned row. From `sm` up there is room for both, so
 * `sm:basis-auto` restores the single-line layout.
 */
const readPaneHeaderClass =
  "sticky top-0 z-10 flex flex-wrap items-center gap-2 bg-surface px-4 pt-2 pb-0 sm:flex-nowrap sm:px-5";

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
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-surface">
        <header className={readPaneHeaderClass}>
          <h2 className="min-w-0 w-full text-lg font-semibold text-foreground sm:w-auto sm:flex-1">{headerSubject}</h2>
          {toolbar ? (
            /* Same phone ordering as the loaded header below: actions above the
             * subject, inline again from `sm` up. */
            <div className="max-sm:order-first max-sm:w-full sm:order-none">
              <MailboxThreadToolbar
                {...toolbar}
                threadId={threadId}
                allowReplies={listSummary.allowReplies ?? false}
                fullThreadHref={fullThreadHref}
              />
            </div>
          ) : null}
        </header>
        <article className="flex-1 overflow-y-auto px-4 pt-0 pb-5 sm:px-5">
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
    <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-surface">
      <header className={readPaneHeaderClass}>
        {/*
          THE ACTIONS SIT ABOVE THE SUBJECT ON PHONES.

          DOM order stays title-first (the heading should be read first by a
          screen reader); `max-sm:order-first` moves only the actions up visually,
          and `sm:order-none` restores their inline position from `sm` up where
          title and icons share one row.
        */}
        <h2 className="min-w-0 w-full text-base font-semibold leading-snug text-foreground sm:w-auto sm:flex-1 sm:text-lg">
          {detail.summary.subject}
        </h2>
        {toolbar ? (
          <div className="max-sm:order-first max-sm:w-full sm:order-none">
            <MailboxThreadToolbar
              {...toolbar}
              threadId={threadId}
              allowReplies={detail.summary.allowReplies}
              fullThreadHref={fullThreadHref}
            />
          </div>
        ) : null}
      </header>

      <Tooltip
        content={openHint}
        placement="bottom"
        className="flex min-h-0 min-w-0 flex-1 flex-col"
      >
        <article
          className="block w-full flex-1 cursor-pointer overflow-y-auto px-4 pt-0 pb-5 sm:px-5"
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
