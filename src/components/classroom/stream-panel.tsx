"use client";

import { useState } from "react";
import { Loader2, MessageSquare, Send, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocale, useT } from "@/lib/i18n/client";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  createAnnouncement,
  createStreamComment,
  deleteAnnouncement,
  deleteStreamComment,
} from "@/lib/teachers/stream-actions";
import type { StreamComment, StreamPost } from "@/lib/dashboard/stream";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.charAt(0) ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1].charAt(0) : "";
  return (first + last).toUpperCase() || "W";
}

function relativeTime(iso: string, locale: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diffMs / 60000);
  const formatter = new Intl.RelativeTimeFormat(locale === "en" ? "en-US" : "es-CR", {
    numeric: "auto",
  });
  if (Math.abs(minutes) < 60) return formatter.format(-minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return formatter.format(-hours, "hour");
  return formatter.format(-Math.round(hours / 24), "day");
}

/** Stream (Novedades): the teacher posts announcements and replies to comments. */
export function StreamPanel({
  classId,
  posts,
}: {
  classId: string;
  posts: StreamPost[];
}) {
  const t = useT();
  const s = t.stream;
  const locale = useLocale();
  const [body, setBody] = useState("");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<StreamPost | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function publish() {
    const text = body.trim();
    if (!text || posting) return;
    setPosting(true);
    setError(null);
    const res = await createAnnouncement({ classId, body: text });
    setPosting(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setBody("");
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const res = await deleteAnnouncement({ id: deleteTarget.id, classId });
    setDeleting(false);
    if (!res.ok) {
      setError(res.error);
      setDeleteTarget(null);
      return;
    }
    setDeleteTarget(null);
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-3">
        <textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          rows={3}
          maxLength={5000}
          placeholder={s.placeholder}
          className="resize-none rounded-xl bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-brand-100 dark:focus:ring-brand-950"
        />
        <div className="flex items-center justify-between gap-3">
          {error ? (
            <span className="text-xs font-medium text-error">{error}</span>
          ) : (
            <span className="text-xs font-medium text-foreground/35">
              {body.length}/5000
            </span>
          )}
          <button
            type="button"
            onClick={() => void publish()}
            disabled={posting || body.trim().length === 0}
            className="btn-ink inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-sm font-semibold disabled:opacity-50"
          >
            {posting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {posting ? s.publishing : s.publish}
          </button>
        </div>
      </div>

      {posts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border px-6 py-10 text-center">
          <p className="text-sm font-semibold text-foreground">{s.emptyTitle}</p>
          <p className="mx-auto mt-1 max-w-sm text-xs font-medium text-foreground/50">
            {s.emptyBody}
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {posts.map((post) => (
            <li
              key={post.id}
              className="group flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4"
            >
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl brand-gradient text-xs font-bold text-white">
                  {initials(post.authorName)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-semibold text-foreground">
                      {post.authorName}
                    </span>
                    <span className="shrink-0 text-xs font-medium text-foreground/40">
                      {relativeTime(post.createdAt, locale)}
                    </span>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap break-words text-sm text-foreground/80">
                    {post.body}
                  </p>
                </div>
                {post.mine ? (
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(post)}
                    aria-label={s.delete}
                    title={s.delete}
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-error/70 opacity-0 transition-all hover:bg-error/10 hover:text-error focus:opacity-100 group-hover:opacity-100",
                    )}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                ) : null}
              </div>

              <PostComments classId={classId} post={post} />
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        title={s.deleteConfirm}
        confirmLabel={s.delete}
        cancelLabel={t.classroom.materialsPanel.cancel}
        pending={deleting}
        onConfirm={() => void confirmDelete()}
        onCancel={() => {
          if (!deleting) setDeleteTarget(null);
        }}
      />
    </section>
  );
}

function PostComments({ classId, post }: { classId: string; post: StreamPost }) {
  const t = useT();
  const s = t.stream;
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<StreamComment | null>(null);

  async function send() {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    setError(null);
    const res = await createStreamComment({ postId: post.id, classId, body: text });
    setSending(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setDraft("");
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    const res = await deleteStreamComment({ id: target.id, classId });
    if (!res.ok) setError(res.error);
  }

  return (
    <div className="flex flex-col gap-2 border-t border-border pt-3 pl-12">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex w-fit items-center gap-1.5 text-xs font-semibold text-foreground/55 transition-colors hover:text-foreground"
      >
        <MessageSquare className="h-3.5 w-3.5" />
        {s.commentsTitle(post.comments.length)}
      </button>

      {post.comments.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {post.comments.map((comment) => (
            <li key={comment.id} className="group/c flex items-start gap-2">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-muted text-[10px] font-bold text-foreground/60">
                {initials(comment.authorName)}
              </span>
              <div className="min-w-0 flex-1 rounded-2xl bg-background px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="truncate text-xs font-semibold text-foreground">
                    {comment.authorName}
                  </span>
                  <span className="shrink-0 text-[11px] font-medium text-foreground/40">
                    {relativeTime(comment.createdAt, locale)}
                  </span>
                </div>
                <p className="mt-0.5 whitespace-pre-wrap break-words text-sm text-foreground/80">
                  {comment.body}
                </p>
              </div>
              {comment.mine ? (
                <button
                  type="button"
                  onClick={() => setDeleteTarget(comment)}
                  aria-label={s.deleteComment}
                  title={s.deleteComment}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-error/60 opacity-0 transition-all hover:bg-error/10 hover:text-error group-hover/c:opacity-100"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      {open || post.comments.length > 0 ? (
        <div className="flex items-center gap-2">
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onFocus={() => setOpen(true)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void send();
              }
            }}
            placeholder={s.commentPlaceholder}
            maxLength={2000}
            className="h-9 flex-1 rounded-full border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20"
          />
          <button
            type="button"
            onClick={() => void send()}
            disabled={sending || draft.trim().length === 0}
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border px-3 text-sm font-semibold text-foreground/70 transition-colors hover:bg-surface-muted disabled:opacity-50"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {sending ? s.commenting : s.comment}
          </button>
        </div>
      ) : null}

      {error ? <p className="text-xs font-medium text-error">{error}</p> : null}

      <ConfirmDialog
        open={deleteTarget !== null}
        title={s.deleteComment}
        confirmLabel={s.delete}
        cancelLabel={t.classroom.materialsPanel.cancel}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
