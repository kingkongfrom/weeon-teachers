"use client";

import { ArrowLeft, Download, Loader2, RotateCcw, Trash2, Users } from "lucide-react";
import type { TeacherCircularDetail } from "@/lib/dashboard/teacher-circulars";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/use-i18n";

function categoryBadgeStyle(color: string) {
  return {
    backgroundColor: `${color}22`,
    color,
    borderColor: `${color}44`,
  };
}

const primaryButton =
  "inline-flex h-10 items-center gap-2 rounded-xl bg-[#0891B2] px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#0e7490]";

/** Reading pane for one published circular: header, PDF preview, description. */
export function CircularPreviewPane({
  detail,
  loading,
  onClose,
  onDelete,
  onRestore,
  onPermanentDelete,
}: {
  detail: TeacherCircularDetail | null;
  loading: boolean;
  onClose: () => void;
  onDelete?: () => void;
  onRestore?: () => void;
  onPermanentDelete?: () => void;
}) {
  const t = useT();
  const primary = detail?.attachments[0];

  return (
    <div className="flex h-full min-h-0 flex-col bg-[var(--wa-header)]">
      <div className="flex shrink-0 items-center gap-3 border-b border-[var(--wa-border)] bg-[var(--wa-header)] px-3 py-2.5">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--wa-icon)] hover:bg-[var(--wa-hover)] lg:hidden"
          aria-label={t("comms.backToCircularAudience")}
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          {detail ? (
            <>
              <h2 className="truncate text-[16px] font-semibold leading-tight text-[var(--wa-text)]">
                {detail.title}
              </h2>
              <p className="truncate text-[12.5px] leading-tight text-[var(--wa-muted)]">
                {detail.recipientsLabel || t("comms.noRecipients")}
              </p>
            </>
          ) : null}
        </div>
        {detail?.categoryName && detail.categoryColor ? (
          <span
            className="shrink-0 rounded-full border px-3 py-1 text-xs font-bold"
            style={categoryBadgeStyle(detail.categoryColor)}
          >
            {detail.categoryName}
          </span>
        ) : null}
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[var(--wa-panel)] p-3">
        {loading ? (
          <div className="flex h-full min-h-[280px] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-[var(--wa-muted)]" />
          </div>
        ) : primary?.kind === "pdf" && primary.url ? (
          <div className="flex min-h-[280px] flex-1 flex-col overflow-hidden rounded-xl border border-[var(--wa-border)]">
            <iframe
              key={primary.url}
              src={primary.url}
              title={primary.name}
              className="h-full min-h-[280px] w-full flex-1 bg-white"
            />
          </div>
        ) : primary?.kind === "image" && primary.url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={primary.url}
            alt={primary.name}
            className="mx-auto max-h-full rounded-xl border border-[var(--wa-border)] object-contain"
          />
        ) : primary ? (
          <div className="flex h-full min-h-[280px] flex-col items-center justify-center gap-3 text-center">
            <p className="text-sm font-semibold text-[var(--wa-text)]">{primary.name}</p>
            <p className="max-w-sm text-xs font-medium text-[var(--wa-muted)]">
              {t("comms.documents.previewUnavailable")}
            </p>
            {primary.url ? (
              <a href={primary.url} target="_blank" rel="noreferrer" className={primaryButton}>
                <Download className="h-4 w-4" />
                {t("comms.documents.download")}
              </a>
            ) : null}
          </div>
        ) : (
          <div className="flex h-full min-h-[280px] items-center justify-center text-sm font-medium text-[var(--wa-muted)]">
            {t("comms.documents.noAttachments")}
          </div>
        )}
      </div>

      {detail?.description ? (
        <div className="shrink-0 border-t border-[var(--wa-border)] px-5 py-3 text-sm font-medium text-[var(--wa-text)]">
          {detail.description}
        </div>
      ) : null}

      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-[var(--wa-border)] bg-[var(--wa-header)] px-4 py-3">
        <span
          className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--wa-muted)]"
          title={detail?.recipientsLabel}
        >
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--wa-border)] text-[var(--wa-icon)]">
            <Users className="h-4 w-4" />
          </span>
          {detail?.recipientsLabel}
        </span>
        <div className="flex items-center gap-2">
          {onRestore ? (
            <button
              type="button"
              onClick={onRestore}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--wa-border)] px-3 text-sm font-semibold text-[var(--wa-text)] hover:bg-[var(--wa-hover)]"
            >
              <RotateCcw className="h-4 w-4" />
              {t("comms.documents.restore")}
            </button>
          ) : null}
          {onPermanentDelete ? (
            <button
              type="button"
              onClick={onPermanentDelete}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-transparent bg-error/10 px-3 text-sm font-semibold text-error hover:bg-error/15"
            >
              <Trash2 className="h-4 w-4" />
              {t("comms.deletePermanently")}
            </button>
          ) : null}
          {onDelete ? (
            <button
              type="button"
              onClick={onDelete}
              aria-label={t("comms.folderTrash")}
              title={t("comms.folderTrash")}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--wa-border)] text-[var(--wa-icon)] hover:bg-[var(--wa-hover)]"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          ) : null}
          {primary?.url ? (
            <a href={primary.url} download={primary.name} className={cn(primaryButton)}>
              <Download className="h-4 w-4" />
              {t("comms.documents.download")}
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}
