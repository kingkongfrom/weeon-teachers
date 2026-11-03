"use client";

import { useState } from "react";
import { ArrowLeft, Download, Loader2, Users } from "lucide-react";
import { PdfReaderDialog, PdfViewport } from "@/components/ui/pdf-reader";
import type { TeacherCircularDetail } from "@/lib/dashboard/teacher-circulars";
import { useLiveT } from "@/lib/i18n/use-i18n";
import { cn } from "@/lib/utils";

function categoryBadgeStyle(color: string) {
  return {
    backgroundColor: `${color}22`,
    color,
    borderColor: `${color}44`,
  };
}

/**
 * Category colours are picked to read as chips on the app surface, not as text
 * on a scrolling document. Keep the hue but pull it toward the card's ink so
 * the label stays legible in both themes.
 */
function readableCategoryText(color: string): string {
  return `color-mix(in oklab, ${color} 72%, currentColor)`;
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
  onEdit,
}: {
  detail: TeacherCircularDetail | null;
  loading: boolean;
  onClose: () => void;
  onDelete?: () => void;
  onRestore?: () => void;
  onPermanentDelete?: () => void;
  /** Omitted for trashed circulares, which must be restored first. */
  onEdit?: () => void;
}) {
  const t = useLiveT();
  const primary = detail?.attachments[0];
  const [pdfFullscreen, setPdfFullscreen] = useState(false);

  return (
    <div className="flex h-full min-h-0 flex-col bg-[var(--wa-header)]">
      {/* The title and category are laid over the preview at every width, so
          this header row stays hidden. */}
      <div className="hidden shrink-0 items-center gap-3 border-b border-[var(--wa-border)] bg-[var(--wa-header)] px-3 py-2.5">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--wa-icon)] hover:bg-[var(--wa-hover)]"
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

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[var(--wa-panel)] px-3 pb-3 pt-3 lg:items-center lg:justify-center">
        <div className="relative flex min-h-0 w-full flex-1 flex-col lg:h-full lg:max-h-full lg:max-w-[min(460px,58vh)] lg:flex-none lg:self-center">
        {loading ? (
          <div className="flex h-full min-h-[280px] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-[var(--wa-muted)]" />
          </div>
        ) : primary?.kind === "pdf" && primary.url ? (
          <button
            type="button"
            onClick={() => setPdfFullscreen(true)}
            aria-label={t("comms.documents.expand")}
            className="group flex min-h-[280px] w-full flex-1 cursor-zoom-in flex-col overflow-hidden rounded-xl border border-[var(--wa-border)] lg:h-full lg:max-h-full"
          >
            <PdfViewport
              key={primary.url}
              url={primary.url}
              showChrome={false}
              onExpand={() => setPdfFullscreen(true)}
            />
          </button>
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

        {/* Title and category laid over the bottom of the preview, with a short
            gradient behind them so the text stays readable on any page. */}
        {detail ? (
          <div className="pointer-events-none absolute inset-x-3 bottom-3 flex items-end justify-between gap-3 rounded-xl bg-white/65 px-3 py-2 shadow-md ring-1 ring-black/10 backdrop-blur-lg dark:bg-neutral-900/60 dark:ring-white/15">
            <div className="min-w-0">
              <h2 className="truncate text-[15px] font-semibold leading-tight text-neutral-900 dark:text-neutral-100">
                {detail.title}
              </h2>
              <p className="flex items-center gap-1 truncate text-[12px] leading-tight text-neutral-600 dark:text-neutral-300">
                <Users className="h-3 w-3 shrink-0" aria-hidden />
                <span className="truncate">{detail.recipientsLabel || t("comms.noRecipients")}</span>
              </p>
            </div>
            {detail.categoryName && detail.categoryColor ? (
              <span
                className="shrink-0 rounded-full border px-3 py-1 text-[11px] font-semibold"
                style={{
                  ...categoryBadgeStyle(detail.categoryColor),
                  backgroundColor: "transparent",
                  borderColor: detail.categoryColor,
                  borderWidth: "0.5px",
                  color: readableCategoryText(detail.categoryColor),
                }}
              >
                {detail.categoryName}
              </span>
            ) : null}
          </div>
        ) : null}
        </div>
      </div>

      {detail?.description ? (
        <div className="shrink-0 border-t border-border px-5 py-3 text-sm font-medium text-[var(--wa-text)]">
          {detail.description}
        </div>
      ) : null}

      <div className="border-t border-border">
        <div className="flex shrink-0 items-center gap-2 bg-[var(--wa-header)] px-[15px] py-3">
          <span
            className="inline-flex min-w-0 items-center gap-2 text-xs font-semibold text-[var(--wa-muted)]"
            title={detail?.recipientsLabel}
          >
            <span className="truncate">{detail?.recipientsLabel}</span>
          </span>
        </div>
      </div>

      {primary?.kind === "pdf" && primary.url ? (
        <PdfReaderDialog
          open={pdfFullscreen}
          url={primary.url}
          name={primary.name}
          onClose={() => setPdfFullscreen(false)}
        />
      ) : null}
    </div>
  );
}
