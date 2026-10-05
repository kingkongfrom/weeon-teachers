"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, PenSquare, Trash2 } from "lucide-react";
import { RichTextView } from "@/components/comms/rich-text";
import { COMMS_COMPOSE } from "@/lib/comms/paths";
import type { MessageDraftSummary } from "@/lib/comms/message-draft";
import type { MessageDraftRecord } from "@/lib/comms/message-draft";
import { deleteMessageDraft, fetchMessageDraft } from "@/lib/teachers/comms-actions";
import { useT } from "@/lib/i18n/use-i18n";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

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

const draftCache = new Map<string, MessageDraftRecord>();

export function MailboxDraftReadingPane({
  draftId,
  summary,
  onDeleted,
}: {
  draftId: string | null;
  summary: MessageDraftSummary | null;
  onDeleted: (id: string) => void;
}) {
  const t = useT();
  const [record, setRecord] = useState<MessageDraftRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!draftId) {
      setRecord(null);
      return;
    }
    const cached = draftCache.get(draftId);
    if (cached) {
      setRecord(cached);
      setLoading(false);
    } else {
      setLoading(true);
    }
    let cancelled = false;
    void fetchMessageDraft(draftId).then((result) => {
      if (cancelled) return;
      if (result) draftCache.set(draftId, result);
      setRecord(result);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [draftId]);

  if (!draftId || !summary) {
    return (
      <div className="flex min-w-[24rem] flex-1 items-center justify-center px-8 text-center">
        <div>
          <p className="text-sm font-semibold text-foreground">{t("comms.emptyDrafts")}</p>
          <p className="mt-1 text-xs font-medium text-foreground/50">{t("comms.selectDraftPreview")}</p>
        </div>
      </div>
    );
  }

  const subject = summary.subject.trim() || t("comms.draftNoSubject");
  const showSpinner = loading && !record;

  return (
    <>
      <article className="flex min-w-[24rem] flex-1 flex-col overflow-hidden">
        <div className="flex shrink-0 items-start gap-3 border-b border-border px-6 py-4">
          <h2 className="min-w-0 flex-1 text-xl font-semibold text-foreground">{subject}</h2>
          <div className="flex shrink-0 items-center gap-1">
            <Link
              href={`${COMMS_COMPOSE}?draft=${draftId}`}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#0891B2] px-3 text-sm font-semibold text-white hover:bg-[#0e7490]"
            >
              <PenSquare className="h-4 w-4" />
              {t("comms.continueDraft")}
            </Link>
            <button
              type="button"
              onClick={() => setConfirmOpen(true)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-foreground/55 hover:border-error/40 hover:bg-error/5 hover:text-error"
              aria-label={t("comms.deleteDraft")}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <p className="text-xs text-foreground/45">{formatDate(summary.updatedAt)}</p>
          {showSpinner ? (
            <div className="mt-8 flex justify-center text-foreground/40">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : record ? (
            <div className="mt-4 text-sm leading-relaxed text-foreground/90">
              <RichTextView doc={record.body} />
            </div>
          ) : (
            <p className="mt-4 text-sm text-foreground/60">{summary.preview || t("comms.emptyDraftsBody")}</p>
          )}
        </div>
      </article>

      <ConfirmDialog
        open={confirmOpen}
        title={t("comms.deleteDraftConfirm")}
        description={t("comms.deleteDraftBody")}
        confirmLabel={t("comms.deleteDraft")}
        cancelLabel={t("common.cancel")}
        pending={deleting}
        onConfirm={() => {
          if (deleting) return;
          setDeleting(true);
          void deleteMessageDraft(draftId).then((res) => {
            setDeleting(false);
            if (!res.ok) return;
            draftCache.delete(draftId);
            setConfirmOpen(false);
            onDeleted(draftId);
          });
        }}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}
