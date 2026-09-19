"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown, ChevronUp, Loader2, Paperclip, RotateCcw, Trash2 } from "lucide-react";
import {
  messageTrashExit,
  messageTrashTransition,
} from "@/components/comms/message-trash-motion";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { RichTextView } from "@/components/comms/rich-text";
import { TONE_PILL } from "@/lib/dashboard/hub-tones";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/use-i18n";
import { MessageBodyEditor } from "@/components/comms/message-body-editor";
import { Button } from "@/components/ui/button";
import { emptyDoc, type RichTextDoc } from "@/lib/comms/model";
import {
  deleteMessageThread,
  markThreadRead,
  sendThreadMessage,
  setThreadFolder,
} from "@/lib/teachers/comms-actions";
import type { MessageThreadDetail } from "@/lib/dashboard/messages";

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

/** Thread detail with optional reply composer for two-way correo. */
export function ThreadView({
  detail,
  mailboxBase,
}: {
  detail: MessageThreadDetail;
  mailboxBase: string;
}) {
  const t = useT();
  const router = useRouter();
  const [showRecipients, setShowRecipients] = useState(false);
  const [replyBody, setReplyBody] = useState<RichTextDoc>(() => emptyDoc());
  const [replyFiles, setReplyFiles] = useState<File[]>([]);
  const [replying, setReplying] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);
  const [moving, setMoving] = useState(false);
  const [trashing, setTrashing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const trashPending = useRef(false);

  async function moveFolder(folder: "inbox" | "sent" | "trash") {
    if (moving) return;

    if (folder === "trash") {
      setMoving(true);
      trashPending.current = true;
      setTrashing(true);
      return;
    }

    setMoving(true);
    const res = await setThreadFolder(detail.summary.id, folder);
    setMoving(false);
    if (res.ok) {
      router.push(mailboxBase);
      router.refresh();
    }
  }

  async function finishTrashMove() {
    if (!trashPending.current) return;
    trashPending.current = false;
    const res = await setThreadFolder(detail.summary.id, "trash");
    setMoving(false);
    if (res.ok) {
      router.push(`${mailboxBase}?folder=trash`);
      router.refresh();
      return;
    }
    setTrashing(false);
  }

  async function confirmDelete() {
    if (deleting) return;
    setDeleting(true);
    const res = await deleteMessageThread(detail.summary.id);
    setDeleting(false);
    if (!res.ok) return;
    setDeleteOpen(false);
    router.push(`${mailboxBase}?folder=trash`);
    router.refresh();
  }

  useEffect(() => {
    void markThreadRead(detail.summary.id);
  }, [detail.summary.id]);

  const firstMessage = detail.messages[0];
  const fromName = firstMessage
    ? firstMessage.mine
      ? t("comms.you")
      : firstMessage.authorName || t("comms.authorFallback")
    : detail.summary.mine
      ? t("comms.you")
      : detail.summary.counterpart;

  const recipientNames = detail.recipients.map((recipient) => recipient.name).filter(Boolean);
  const recipientSummary =
    detail.summary.audience === "group"
      ? detail.summary.counterpart
      : recipientNames.join(", ") || detail.summary.counterpart;

  return (
    <div className="relative flex flex-col gap-5">
      <AnimatePresence>
        {trashing ? (
          <motion.div
            role="status"
            initial={{ opacity: 0, y: -12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ type: "spring", stiffness: 420, damping: 28 }}
            className="pointer-events-none fixed left-1/2 top-20 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full border border-error/25 bg-error px-4 py-2.5 text-sm font-semibold text-white shadow-lg"
          >
            <Trash2 className="h-4 w-4" aria-hidden />
            {t("comms.movedToTrash")}
          </motion.div>
        ) : null}
      </AnimatePresence>

      <motion.div
        className="flex flex-col gap-5"
        animate={trashing ? messageTrashExit : { opacity: 1, x: 0, scale: 1 }}
        transition={messageTrashTransition}
        onAnimationComplete={() => {
          if (trashing) void finishTrashMove();
        }}
      >
        <div className="flex flex-wrap justify-end gap-2">
          {detail.summary.folder === "trash" ? (
            <>
              <button
                type="button"
                disabled={moving || deleting}
                onClick={() => void moveFolder(detail.summary.mine ? "sent" : "inbox")}
                className="ui-hover inline-flex h-9 items-center gap-2 rounded-xl border border-border px-3 text-sm font-semibold text-foreground/70 hover:text-foreground disabled:opacity-50"
              >
                <RotateCcw className="h-4 w-4" />
                {t("comms.restoreMessage")}
              </button>
              {detail.summary.mine ? (
                <button
                  type="button"
                  disabled={moving || deleting}
                  onClick={() => setDeleteOpen(true)}
                  className="ui-hover inline-flex h-9 items-center gap-2 rounded-xl border border-error/30 px-3 text-sm font-semibold text-error hover:bg-error/10 disabled:opacity-50"
                >
                  {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  {t("comms.deletePermanently")}
                </button>
              ) : null}
            </>
          ) : (
            <button
              type="button"
              disabled={moving}
              onClick={() => void moveFolder("trash")}
              className="ui-hover inline-flex h-9 items-center gap-2 rounded-xl border border-border px-3 text-sm font-semibold text-foreground/70 hover:text-error disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />
              {t("comms.moveToTrash")}
            </button>
          )}
        </div>

        <section className="overflow-hidden rounded-2xl border border-border bg-surface">
          <div className="border-b border-border bg-surface-muted/40 px-5 py-4">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold text-foreground">{detail.summary.subject}</h2>
              {detail.summary.audience === "group" ? (
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                    TONE_PILL.green,
                  )}
                >
                  {t("comms.groupTag")}
                </span>
              ) : null}
              {detail.summary.className ? (
                <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[11px] font-semibold text-foreground/55">
                  {detail.summary.className}
                </span>
              ) : null}
            </div>
            <dl className="mt-3 grid gap-1.5 text-sm">
              <div className="flex flex-wrap gap-x-2">
                <dt className="font-semibold text-foreground/50">{t("comms.from")}:</dt>
                <dd className="font-medium text-foreground">{fromName}</dd>
              </div>
              <div className="flex flex-wrap gap-x-2">
                <dt className="font-semibold text-foreground/50">{t("comms.toLabel")}:</dt>
                <dd className="min-w-0 flex-1 font-medium text-foreground">{recipientSummary}</dd>
                {recipientNames.length > 2 ? (
                  <button
                    type="button"
                    onClick={() => setShowRecipients((value) => !value)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-brand-500 hover:underline"
                  >
                    {showRecipients ? t("comms.hideRecipients") : t("comms.showRecipients")}
                    {showRecipients ? (
                      <ChevronUp className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5" />
                    )}
                  </button>
                ) : null}
              </div>
              {showRecipients && recipientNames.length > 2 ? (
                <dd className="text-xs leading-relaxed text-foreground/60">{recipientNames.join(", ")}</dd>
              ) : null}
              {firstMessage ? (
                <div className="flex flex-wrap gap-x-2">
                  <dt className="font-semibold text-foreground/50">{t("comms.date")}:</dt>
                  <dd className="font-medium text-foreground/70">{formatDate(firstMessage.createdAt)}</dd>
                </div>
              ) : null}
            </dl>
          </div>

          {detail.attachments.length > 0 ? (
            <div className="flex flex-wrap gap-2 border-b border-border px-5 py-3">
              <span className="w-full text-xs font-semibold text-foreground/50">
                {t("comms.attachments")}
              </span>
              {detail.attachments.map((attachment) => (
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

          <div className="px-5 py-5">
            {detail.messages.map((message, index) => (
              <article
                key={message.id}
                className={cn(
                  index > 0 && "mt-6 border-t border-border pt-6",
                  index > 0 && "border-l-2 border-brand-400/40 pl-4",
                )}
              >
                {index > 0 ? (
                  <header className="mb-2 flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-semibold text-foreground">
                      {message.mine ? t("comms.you") : message.authorName || t("comms.authorFallback")}
                    </span>
                    <span className="text-foreground/40">{formatDate(message.createdAt)}</span>
                  </header>
                ) : null}
                <RichTextView doc={message.body} className="text-sm leading-relaxed text-foreground/90" />
              </article>
            ))}
          </div>
        </section>

        {detail.allowReplies ? (
          <section className="rounded-2xl border border-border bg-surface p-5">
            <h3 className="text-sm font-bold text-foreground">{t("comms.replySection")}</h3>
            <div className="mt-3">
              <MessageBodyEditor
                label={t("comms.body")}
                value={replyBody}
                onChange={setReplyBody}
                placeholder={t("comms.replyPlaceholder")}
                editorClassName="min-h-[8rem]"
                files={replyFiles}
                onFilesChange={setReplyFiles}
                disabled={replying}
              />
            </div>
            {replyError ? (
              <p className="mt-2 rounded-lg bg-error/10 px-3 py-2 text-sm font-medium text-error">
                {replyError}
              </p>
            ) : null}
            <div className="mt-4 flex justify-end">
              <Button
                disabled={replying}
                onClick={() => {
                  void (async () => {
                    setReplying(true);
                    setReplyError(null);
                    const res = await sendThreadMessage(detail.summary.id, replyBody);
                    if (!res.ok) {
                      setReplyError(res.error);
                      setReplying(false);
                      return;
                    }
                    setReplyBody(emptyDoc());
                    setReplyFiles([]);
                    setReplying(false);
                    router.refresh();
                  })();
                }}
              >
                {replying ? t("comms.sending") : t("comms.sendReply")}
              </Button>
            </div>
          </section>
        ) : null}
      </motion.div>

      <ConfirmDialog
        open={deleteOpen}
        title={t("comms.deletePermanentlyConfirm")}
        description={t("comms.deletePermanentlyBody")}
        confirmLabel={t("comms.deletePermanently")}
        cancelLabel={t("common.cancel")}
        pending={deleting}
        onConfirm={() => void confirmDelete()}
        onCancel={() => {
          if (!deleting) setDeleteOpen(false);
        }}
      />
    </div>
  );
}
