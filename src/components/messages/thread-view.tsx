"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Paperclip, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RichTextEditor, RichTextView } from "@/components/assessments/rich-text";
import { AttachmentDropzone } from "@/components/messages/attachment-dropzone";
import { useT } from "@/lib/i18n/client";
import { docToPlainText, emptyDoc, type RichTextDoc } from "@/lib/assessments/model";
import {
  markThreadRead,
  sendThreadMessage,
  uploadMessageAttachment,
} from "@/lib/teachers/message-actions";
import type { MessageThreadDetail } from "@/lib/dashboard/messages";

function relativeTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("es-CR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** One thread: the message history and a reply composer. */
export function ThreadView({ detail }: { detail: MessageThreadDetail }) {
  const t = useT();
  const m = t.messages;
  const router = useRouter();
  const [reply, setReply] = useState<RichTextDoc>(() => emptyDoc());
  const [files, setFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void markThreadRead(detail.summary.id);
  }, [detail.summary.id]);

  async function send() {
    if (docToPlainText(reply).trim().length === 0 || sending) return;
    setSending(true);
    setError(null);
    const res = await sendThreadMessage(detail.summary.id, reply);
    if (!res.ok) {
      setSending(false);
      setError(res.error);
      return;
    }
    for (const file of files) {
      const formData = new FormData();
      formData.set("threadId", detail.summary.id);
      formData.set("file", file);
      const uploaded = await uploadMessageAttachment(formData);
      if (!uploaded.ok) {
        setError(uploaded.error);
        break;
      }
    }
    setSending(false);
    setReply(emptyDoc());
    setFiles([]);
    router.refresh();
  }

  const recipientNames = detail.recipients.map((recipient) => recipient.name).filter(Boolean);

  return (
    <div className="flex flex-col gap-5">
      <section className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-5">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-bold text-foreground">{detail.summary.subject}</h2>
          {detail.summary.audience === "group" ? (
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
              {m.groupTag}
            </span>
          ) : null}
          {detail.summary.className ? (
            <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[11px] font-semibold text-foreground/55">
              {detail.summary.className}
            </span>
          ) : null}
        </div>
        <p className="text-xs font-medium text-foreground/50">
          {m.recipients}: {recipientNames.join(", ") || detail.summary.counterpart}
        </p>
      </section>

      {detail.attachments.length > 0 ? (
        <section className="flex flex-wrap gap-2">
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
        </section>
      ) : null}

      <ul className="flex flex-col gap-3">
        {detail.messages.map((message) => (
          <li
            key={message.id}
            className="flex flex-col gap-1.5 rounded-2xl border border-border bg-surface p-4"
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground">
                {message.mine ? "Tú" : message.authorName || "Docente"}
              </span>
              <span className="text-xs font-medium text-foreground/40">
                {relativeTime(message.createdAt)}
              </span>
            </div>
            <RichTextView doc={message.body} className="text-sm" />
          </li>
        ))}
      </ul>

      {detail.allowReplies ? (
        <section className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5">
          <RichTextEditor value={reply} onChange={setReply} placeholder={m.replyPlaceholder} />
          <AttachmentDropzone files={files} onChange={setFiles} disabled={sending} />
          {error ? (
            <p className="rounded-lg bg-error/10 px-3 py-2 text-sm font-medium text-error">{error}</p>
          ) : null}
          <div className="flex justify-end">
            <Button onClick={() => void send()} disabled={sending}>
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {sending ? m.sending : m.sendReply}
            </Button>
          </div>
        </section>
      ) : (
        <p className="rounded-xl bg-surface-muted px-4 py-3 text-sm font-medium text-foreground/55">
          {m.noReplies}
        </p>
      )}
    </div>
  );
}
