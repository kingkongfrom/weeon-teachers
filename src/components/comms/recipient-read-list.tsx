"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useT } from "@/lib/i18n/use-i18n";
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

function byReadThenName(a: MessageRecipient, b: MessageRecipient): number {
  if (Boolean(a.readAt) !== Boolean(b.readAt)) return a.readAt ? 1 : -1;
  return a.name.localeCompare(b.name, "es");
}

/** Who opened a message this teacher sent. Unopened names come first. */
export function RecipientReadList({ recipients }: { recipients: MessageRecipient[] }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  if (recipients.length === 0) return null;

  const read = recipients.filter((row) => row.readAt).length;
  const rows = [...recipients].sort(byReadThenName);

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex items-center gap-1 text-xs font-semibold text-foreground/55 hover:text-foreground"
      >
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        {t("comms.readReceiptSummary", { read: String(read), total: String(recipients.length) })}
      </button>
      {open ? (
        <ul className="mt-2 max-h-64 overflow-y-auto rounded-xl border border-border bg-background/60">
          {rows.map((recipient) => (
            <li
              key={`${recipient.profileId}-${recipient.name}`}
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
      ) : null}
    </div>
  );
}
