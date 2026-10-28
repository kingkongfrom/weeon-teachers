"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useLiveT } from "@/lib/i18n/use-i18n";
import {
  partitionReadRecipients,
  READ_RECEIPT_NAME_CAP,
  UNREAD_RECEIPT_NAME_CAP,
  dedupeMessageRecipients,
} from "@/lib/comms/recipient-read-utils";
import type { MessageRecipient } from "@/lib/dashboard/messages";

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("es-CR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function RecipientRows({ rows }: { rows: MessageRecipient[] }) {
  const t = useLiveT();
  return (
    <ul className="divide-y divide-border/60">
      {rows.map((recipient) => (
        <li
          key={recipient.profileId || recipient.name}
          className="flex items-baseline justify-between gap-4 px-3 py-2 text-sm"
        >
          <span className="min-w-0 truncate text-foreground/80">{recipient.name}</span>
          <span className="shrink-0 text-xs text-foreground/45">
            {recipient.readAt
              ? t("comms.readAt", { date: formatDate(recipient.readAt) })
              : t("comms.notOpened")}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Who opened a circular or a message the school sent — compact for bulk sends. */
export function RecipientReadList({ recipients }: { recipients: MessageRecipient[] }) {
  const t = useLiveT();
  const [open, setOpen] = useState(false);
  const [showUnreadNames, setShowUnreadNames] = useState(false);

  const { total, read, unreadCount, unreadSample } = useMemo(() => {
    const deduped = dedupeMessageRecipients(recipients);
    const { read: readRows, unreadCount: unread } = partitionReadRecipients(deduped);
    const unreadRows = deduped
      .filter((row) => !row.readAt)
      .sort((a, b) => a.name.localeCompare(b.name, "es"));
    return {
      total: deduped.length,
      read: readRows,
      unreadCount: unread,
      unreadSample: unreadRows,
    };
  }, [recipients]);

  if (total === 0) return null;

  const readShown = read.slice(0, READ_RECEIPT_NAME_CAP);
  const readHidden = read.length - readShown.length;
  const unreadShown = showUnreadNames
    ? unreadSample.slice(0, UNREAD_RECEIPT_NAME_CAP)
    : [];
  const unreadHidden =
    showUnreadNames && unreadSample.length > UNREAD_RECEIPT_NAME_CAP
      ? unreadSample.length - UNREAD_RECEIPT_NAME_CAP
      : 0;

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => {
          setOpen((value) => {
            if (value) setShowUnreadNames(false);
            return !value;
          });
        }}
        className="inline-flex items-center gap-1 text-xs font-semibold text-foreground/55 hover:text-foreground"
      >
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        {t("comms.readReceiptSummary", {
          read: String(read.length),
          total: String(total),
        })}
      </button>

      {open ? (
        <div className="mt-2 space-y-3 rounded-xl border border-border bg-background/60">
          {read.length === 0 ? (
            <p className="px-3 py-2 text-sm text-foreground/50">{t("comms.readReceiptNobodyYet")}</p>
          ) : (
            <div>
              <p className="border-b border-border/60 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-foreground/45">
                {t("comms.readReceiptReadSection")}
              </p>
              <RecipientRows rows={readShown} />
              {readHidden > 0 ? (
                <p className="px-3 py-2 text-xs font-medium text-foreground/45">
                  {t("comms.readReceiptAndMoreRead", { n: String(readHidden) })}
                </p>
              ) : null}
            </div>
          )}

          {unreadCount > 0 ? (
            <div className="border-t border-border/60">
              <p className="px-3 py-2 text-sm font-medium text-foreground/55">
                {t("comms.readReceiptUnreadSummary", { n: String(unreadCount) })}
              </p>
              {!showUnreadNames ? (
                <button
                  type="button"
                  onClick={() => setShowUnreadNames(true)}
                  className="px-3 pb-2 text-xs font-semibold text-brand-600 hover:underline dark:text-brand-400"
                >
                  {t("comms.readReceiptShowUnreadNames")}
                </button>
              ) : (
                <>
                  <RecipientRows rows={unreadShown} />
                  {unreadHidden > 0 ? (
                    <p className="px-3 py-2 text-xs font-medium text-foreground/45">
                      {t("comms.readReceiptAndMoreUnread", { n: String(unreadHidden) })}
                    </p>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setShowUnreadNames(false)}
                    className="px-3 pb-2 text-xs font-semibold text-foreground/45 hover:text-foreground"
                  >
                    {t("comms.readReceiptHideUnreadNames")}
                  </button>
                </>
              )}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
