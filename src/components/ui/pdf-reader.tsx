"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { Download, Loader2, Maximize2, Minus, Plus, RotateCw, X } from "lucide-react";
import { useT } from "@/lib/i18n/use-i18n";

const ZOOM_STEPS = [0.75, 1, 1.25, 1.5, 2] as const;

type PdfPageHandle = {
  getViewport: (params: { scale: number; rotation?: number }) => { width: number; height: number };
  render: (params: {
    canvas: HTMLCanvasElement;
    viewport: { width: number; height: number };
    transform?: number[];
  }) => { cancel: () => void; promise: Promise<void> };
};

type PdfDocumentHandle = {
  numPages: number;
  getPage: (pageNumber: number) => Promise<PdfPageHandle>;
  destroy?: () => Promise<void> | void;
};

export function isPdfFile(name: string, mimeType?: string | null): boolean {
  const mime = mimeType?.split(";")[0]?.trim().toLowerCase() ?? "";
  if (mime === "application/pdf") return true;
  const path = name.split("?")[0]?.split("#")[0]?.toLowerCase() ?? "";
  return path.endsWith(".pdf");
}

/**
 * Images the browser can render natively — these preview INSIDE the app.
 *
 * SVG is excluded on purpose: an attachment is user-supplied, and SVG can carry
 * script. Rendering one in an <img> is inert, but offering an in-app viewer that
 * implies "safe to open" is not a promise worth making for it.
 */
const PREVIEWABLE_IMAGE_MIMES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/gif",
  "image/webp",
  "image/avif",
  "image/bmp",
]);

const PREVIEWABLE_IMAGE_EXT = /\.(png|jpe?g|gif|webp|avif|bmp)$/i;

export function isPreviewableImage(name: string, mimeType?: string | null): boolean {
  const mime = mimeType?.split(";")[0]?.trim().toLowerCase() ?? "";
  if (PREVIEWABLE_IMAGE_MIMES.has(mime)) return true;
  const path = name.split("?")[0]?.split("#")[0] ?? "";
  return PREVIEWABLE_IMAGE_EXT.test(path);
}

/**
 * Opens an attachment INSIDE the app.
 *
 * WHY THIS IS NOT A PLAIN <a target="_blank">:
 *
 * Handing the URL to the browser lets IT decide what happens — a new tab, a
 * download to the Downloads folder, or an external application. In a school
 * inbox that is the wrong owner: a parent tapping a photo of their child should
 * see it, and a teacher should not be spawning tabs. PDFs already previewed here;
 * images now do too, through the same dialog.
 *
 * Types with no in-app preview (Word, Excel, zip) still cannot be rendered — no
 * viewer exists for them — so they get an explicit, labelled open action instead
 * of a silent handoff that looks like the app did something.
 */
export function PdfFileButton({
  url,
  name,
  mimeType,
  className,
  children,
}: {
  url: string;
  name: string;
  mimeType?: string | null;
  className?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const isPdf = isPdfFile(name, mimeType);
  const isImage = !isPdf && isPreviewableImage(name, mimeType);

  if (!isPdf && !isImage) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
        /* Last resort only: there is no viewer for office/zip files, so say so
         * rather than letting the click look like it opened something. */
        title={name}
        download={name}
      >
        {children}
      </a>
    );
  }

  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>
        {children}
      </button>
      {isPdf ? (
        <PdfReaderDialog open={open} url={url} name={name} onClose={() => setOpen(false)} />
      ) : (
        <ImageReaderDialog open={open} url={url} name={name} onClose={() => setOpen(false)} />
      )}
    </>
  );
}

/** Full-screen image preview, mirroring PdfReaderDialog's frame. */
export function ImageReaderDialog({
  open,
  url,
  name,
  onClose,
}: {
  open: boolean;
  url: string | null;
  name: string;
  onClose: () => void;
}) {
  const t = useT();

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (typeof document === "undefined" || !url) return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <div className="wa-chat fixed inset-0 z-[130] flex items-end justify-center sm:items-center sm:p-6">
          <motion.button
            type="button"
            aria-label={t("common.close")}
            className="absolute inset-0 bg-[#0f172a]/75"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={name}
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.2 }}
            className="relative flex max-h-[min(94vh,920px)] w-full max-w-5xl flex-col overflow-hidden rounded-t-2xl border border-border bg-surface shadow-2xl sm:rounded-2xl"
          >
            <header className="flex shrink-0 items-center gap-3 border-b border-border px-4 py-2.5">
              <p className="min-w-0 flex-1 truncate text-sm font-bold text-foreground">{name}</p>
              <a
                href={url}
                download={name}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-foreground/55 hover:bg-surface-muted"
                aria-label={t("comms.documents.download")}
              >
                <Download className="h-4 w-4" />
              </a>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-foreground/55 hover:bg-surface-muted"
                aria-label={t("common.close")}
              >
                <X className="h-4 w-4" />
              </button>
            </header>
            {/* eslint-disable-next-line @next/next/no-img-element -- a signed
                storage URL of unknown dimensions; next/image would need
                width/height it cannot know and would try to optimise a private
                attachment. */}
            <img
              src={url}
              alt={name}
              className="min-h-0 flex-1 overflow-auto object-contain p-3"
            />
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}

export function PdfReaderDialog({
  open,
  url,
  name,
  onClose,
}: {
  open: boolean;
  url: string | null;
  name: string;
  onClose: () => void;
}) {
  const t = useT();

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (typeof document === "undefined" || !url) return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <div className="wa-chat fixed inset-0 z-[130] flex items-end justify-center sm:items-center sm:p-6">
          <motion.button
            type="button"
            aria-label={t("common.close")}
            className="absolute inset-0 bg-[#0f172a]/55"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={name}
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.2 }}
            className="relative flex h-[min(94vh,920px)] w-full max-w-5xl flex-col overflow-hidden rounded-t-2xl border border-border bg-surface shadow-2xl sm:rounded-2xl"
          >
            <header className="flex shrink-0 items-center gap-3 border-b border-border px-4 py-2.5">
              <p className="min-w-0 flex-1 truncate text-sm font-bold text-foreground">{name}</p>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-foreground/55 hover:bg-surface-muted hover:text-foreground"
                aria-label={t("common.close")}
              >
                <X className="h-4 w-4" />
              </button>
            </header>
            <PdfViewport key={url} url={url} downloadName={name} />
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}

/** Page stack with zoom. Used inside the reader and the document preview. */
export function PdfViewport({
  url,
  showChrome = true,
  onExpand,
  topBar,
  downloadName,
}: {
  url: string;
  /** Show the page count + zoom toolbar. Hidden for the compact inline preview. */
  showChrome?: boolean;
  /** When set, a floating expand button opens the full-screen reader. */
  onExpand?: () => void;
  /** Optional content rendered at the left of the toolbar row (e.g. title + actions). */
  topBar?: ReactNode;
  /** When set, the toolbar shows a download button saving as this name. */
  downloadName?: string;
}) {
  const t = useT();
  const frameRef = useRef<HTMLDivElement>(null);
  const [pages, setPages] = useState<PdfPageHandle[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [zoomIndex, setZoomIndex] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [frameWidth, setFrameWidth] = useState(0);
  const [frameHeight, setFrameHeight] = useState(0);
  const zoom = ZOOM_STEPS[zoomIndex] ?? 1;

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const measure = () => {
      // Measure the content box so a scrollbar cannot shave off the page width.
      setFrameWidth(frame.clientWidth);
      setFrameHeight(frame.clientHeight);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(frame);
    return () => observer.disconnect();
  }, [status]);

  useEffect(() => {
    let cancelled = false;
    let doc: PdfDocumentHandle | null = null;
    let loading: { destroy?: () => Promise<void> | void } | null = null;

    // Torn down while the document is still loading: destroy the task, which
    // owns the transport. Calling a half-initialised document's destroy() is
    // what threw "doc.destroy is not a function".
    const releaseLoading = () => {
      const task = loading;
      loading = null;
      if (task && typeof task.destroy === "function") {
        try {
          void Promise.resolve(task.destroy()).catch(() => {});
        } catch {
          /* already torn down */
        }
      }
    };

    void (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
        const task = pdfjs.getDocument({ url, disableRange: true, disableStream: true });
        loading = task;
        const loaded = (await task.promise) as unknown as PdfDocumentHandle;
        loading = null;
        if (cancelled) {
          if (typeof loaded.destroy === "function") {
            try {
              void Promise.resolve(loaded.destroy()).catch(() => {});
            } catch {
              /* already torn down */
            }
          }
          return;
        }
        doc = loaded;
        const next: PdfPageHandle[] = [];
        for (let index = 1; index <= loaded.numPages; index += 1) {
          next.push(await loaded.getPage(index));
          if (cancelled) return;
        }
        setPages(next);
        setStatus("ready");
      } catch {
        loading = null;
        if (!cancelled) setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
      releaseLoading();
      // Not every pdfjs build exposes destroy() on the resolved document; guard
      // it, and swallow a synchronous throw, so cleanup never surfaces a render
      // error ("doc.destroy is not a function").
      const current = doc;
      doc = null;
      if (current && typeof current.destroy === "function") {
        try {
          void Promise.resolve(current.destroy()).catch(() => {
            /* already torn down */
          });
        } catch {
          /* already torn down */
        }
      }
    };
  }, [url]);

  // The compact preview (no chrome) scales the first page to cover its box —
  // it grows past the width when the box is taller than the page, so there is
  // no dead space on either axis. The full reader keeps the padded, centred
  // sheet at the chosen zoom.
  const pageGutter = showChrome ? 48 : 0;
  const firstPage = pages[0];
  const pageRatio = firstPage
    ? (() => {
        const base = firstPage.getViewport({ scale: 1 });
        return base.height / base.width;
      })()
    : 1.4142;
  const widthFit = Math.max(280, Math.floor((frameWidth - pageGutter) * zoom));
  const heightFit = frameHeight > 0 ? Math.floor(frameHeight / pageRatio) : widthFit;
  const pageWidth = showChrome ? widthFit : Math.max(widthFit, heightFit);

  // While loading there is no page to measure. Mirror the same fit math with
  // an A4 ratio so the placeholder is the exact size of the incoming sheet in
  // the compact preview, and the letterboxed sheet in the full reader.
  const placeholderRatio = 1.4142;
  const placeholderWidth = showChrome
    ? Math.min(frameWidth > 0 ? frameWidth - pageGutter : 280, (frameHeight || Infinity) / placeholderRatio)
    : Math.max(
        frameWidth > 0 ? frameWidth - pageGutter : 280,
        frameHeight > 0 ? frameHeight / placeholderRatio : 0,
      );

  return (
    <div className="relative flex min-h-0 flex-1 flex-col bg-[#eef1f6] dark:bg-[#1a2030]">
      {showChrome || topBar ? (
        <div className="flex items-center gap-3 border-b border-border/70 bg-surface/95 px-4 py-2">
          {topBar ? (
            <div className="flex min-w-0 flex-1 items-center gap-3">{topBar}</div>
          ) : (
            <p className="min-w-0 flex-1 truncate text-xs font-semibold text-foreground/55">
              {status === "ready"
                ? pages.length === 1
                  ? t("pdf.onePage")
                  : t("pdf.pages", { count: pages.length })
                : " "}
            </p>
          )}
          <div className="flex shrink-0 items-center gap-1">
            <span className="mr-1 hidden text-xs font-semibold tabular-nums text-foreground/45 sm:inline">
              {status === "ready"
                ? pages.length === 1
                  ? t("pdf.onePage")
                  : t("pdf.pages", { count: pages.length })
                : ""}
            </span>
            <button
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-foreground/60 hover:bg-surface-muted hover:text-foreground disabled:opacity-40"
              aria-label={t("pdf.zoomOut")}
              disabled={zoomIndex === 0}
              onClick={() => setZoomIndex((value) => Math.max(0, value - 1))}
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="w-12 text-center text-xs font-bold tabular-nums text-foreground/70">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-foreground/60 hover:bg-surface-muted hover:text-foreground disabled:opacity-40"
              aria-label={t("pdf.zoomIn")}
              disabled={zoomIndex === ZOOM_STEPS.length - 1}
              onClick={() => setZoomIndex((value) => Math.min(ZOOM_STEPS.length - 1, value + 1))}
            >
              <Plus className="h-4 w-4" />
            </button>
            <span className="mx-1 h-5 w-px bg-border" aria-hidden />
            <button
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-foreground/60 hover:bg-surface-muted hover:text-foreground disabled:opacity-40"
              aria-label={t("pdf.rotate")}
              title={t("pdf.rotate")}
              disabled={status !== "ready"}
              onClick={() => setRotation((value) => (value + 90) % 360)}
            >
              <RotateCw className="h-4 w-4" />
            </button>
            {downloadName ? (
              <a
                href={url}
                download={downloadName}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-foreground/60 hover:bg-surface-muted hover:text-foreground"
                aria-label={t("comms.documents.download")}
                title={t("comms.documents.download")}
              >
                <Download className="h-4 w-4" />
              </a>
            ) : null}
          </div>
        </div>
      ) : null}

      {onExpand ? (
        <button
          type="button"
          onClick={onExpand}
          aria-label={t("pdf.expand")}
          title={t("pdf.expand")}
          className="absolute right-2 top-2 z-10 inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-surface/95 text-foreground/70 shadow-sm backdrop-blur-sm transition-colors hover:bg-surface-muted hover:text-foreground"
        >
          <Maximize2 className="h-4 w-4" />
        </button>
      ) : null}

      <div
        ref={frameRef}
        className={`min-h-0 flex-1 ${showChrome ? "overflow-auto" : "flex items-center justify-center overflow-hidden bg-[var(--wa-panel)]"}`}
      >
        {status === "loading" ? (
          // Same box the page will occupy (width from the frame, A4 ratio), so
          // nothing shifts when the document paints.
          <div
            className={
              showChrome
                ? "flex h-full min-h-[280px] items-start justify-center px-6 py-6"
                : "flex h-full w-full items-center justify-center"
            }
            role="status"
            aria-live="polite"
            aria-label={t("pdf.loading")}
          >
            <div
              className="flex animate-pulse flex-col gap-3 rounded-sm bg-white p-6 shadow-[0_12px_40px_-18px_rgba(15,23,42,0.45)] dark:bg-neutral-100"
              style={{
                width: `${Math.max(1, Math.floor(placeholderWidth))}px`,
                aspectRatio: `1 / ${placeholderRatio}`,
              }}
            >
              <div className="h-2.5 w-1/3 rounded bg-neutral-200" />
              <div className="h-2 w-1/5 rounded bg-neutral-200/70" />
              <div className="mt-4 flex flex-1 flex-col gap-2">
                {Array.from({ length: 10 }, (_, index) => (
                  <div
                    key={index}
                    className="h-2 rounded bg-neutral-200/70"
                    style={{ width: `${[100, 96, 92, 88, 97, 74, 100, 94, 86, 58][index]}%` }}
                  />
                ))}
              </div>
            </div>
          </div>
        ) : null}
        {status === "error" ? (
          <div className="flex h-full min-h-[280px] items-center justify-center px-6 text-center">
            <p className="max-w-sm text-sm font-semibold text-foreground/60">{t("pdf.error")}</p>
          </div>
        ) : null}
        {status === "ready" ? (
          <div
            className={
              showChrome
                ? "flex w-max min-w-full flex-col items-center gap-4 px-6 py-6"
                : "flex h-full w-full items-center justify-center overflow-hidden"
            }
          >
            {pages.map((page, index) => (
              <PdfPageCanvas key={index} page={page} width={pageWidth} rotation={rotation} />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function PdfPageCanvas({ page, width, rotation = 0 }: { page: PdfPageHandle; width: number; rotation?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || width < 1) return;
    const base = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale: width / base.width, rotation });
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(viewport.width * pixelRatio);
    canvas.height = Math.floor(viewport.height * pixelRatio);
    canvas.style.width = `${viewport.width}px`;
    canvas.style.height = `${viewport.height}px`;
    const task = page.render({
      canvas,
      viewport,
      transform: [pixelRatio, 0, 0, pixelRatio, 0, 0],
    });
    // A cancelled render (zoom, list refresh, Strict Mode remount) rejects with
    // RenderingCancelledException — expected, not an error. Swallow it so it
    // never surfaces as an unhandled rejection / Next.js error overlay.
    void task.promise.catch(() => {
      /* rendering cancelled — ignore */
    });
    return () => {
      task.cancel();
    };
  }, [page, width, rotation]);

  return (
    // Width comes from the render viewport, so the canvas must never be
    // clamped by CSS: max-w-full would squeeze the width while the height
    // stayed, stretching the page. Overflow scrolls instead.
    <canvas
      ref={canvasRef}
      className="shrink-0 rounded-sm bg-white shadow-[0_12px_40px_-18px_rgba(15,23,42,0.45)]"
    />
  );
}
