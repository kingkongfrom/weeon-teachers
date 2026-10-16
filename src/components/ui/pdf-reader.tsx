"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { Download, Loader2, Maximize2, Minus, Plus, X } from "lucide-react";
import { useT } from "@/lib/i18n/use-i18n";

const ZOOM_STEPS = [0.75, 1, 1.25, 1.5, 2] as const;

type PdfPageHandle = {
  getViewport: (params: { scale: number }) => { width: number; height: number };
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

/** Opens a PDF in the reading window. Other files keep the normal link. */
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
  if (!isPdfFile(name, mimeType)) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className={className}>
        {children}
      </a>
    );
  }
  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>
        {children}
      </button>
      <PdfReaderDialog open={open} url={url} name={name} onClose={() => setOpen(false)} />
    </>
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
        <div className="fixed inset-0 z-[130] flex items-end justify-center sm:items-center sm:p-6">
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
            <PdfViewport
              key={url}
              url={url}
              topBar={
                <>
                  <p className="min-w-0 flex-1 truncate text-sm font-bold text-foreground">{name}</p>
                  <a
                    href={url}
                    download={name}
                    className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border px-3 text-xs font-semibold text-foreground/70 hover:bg-surface-muted hover:text-foreground"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">{t("comms.documents.download")}</span>
                  </a>
                  <button
                    type="button"
                    onClick={onClose}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-foreground/55 hover:bg-surface-muted hover:text-foreground"
                    aria-label={t("common.close")}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </>
              }
            />
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
}: {
  url: string;
  /** Show the page count + zoom toolbar. Hidden for the compact inline preview. */
  showChrome?: boolean;
  /** When set, a floating expand button opens the full-screen reader. */
  onExpand?: () => void;
  /** Optional content rendered at the left of the toolbar row (e.g. title + actions). */
  topBar?: ReactNode;
}) {
  const t = useT();
  const frameRef = useRef<HTMLDivElement>(null);
  const [pages, setPages] = useState<PdfPageHandle[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [zoomIndex, setZoomIndex] = useState(1);
  const [frameWidth, setFrameWidth] = useState(0);
  const zoom = ZOOM_STEPS[zoomIndex] ?? 1;

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const measure = () => setFrameWidth(frame.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(frame);
    return () => observer.disconnect();
  }, [status]);

  useEffect(() => {
    let cancelled = false;
    let doc: PdfDocumentHandle | null = null;

    void (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
        const task = pdfjs.getDocument({ url, disableRange: true, disableStream: true });
        const loaded = (await task.promise) as unknown as PdfDocumentHandle;
        if (cancelled) {
          if (typeof loaded.destroy === "function") void loaded.destroy();
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
        if (!cancelled) setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
      // Not every pdfjs build exposes destroy() on the resolved document; guard
      // it so cleanup never throws ("doc.destroy is not a function").
      if (doc && typeof doc.destroy === "function") {
        void Promise.resolve(doc.destroy()).catch(() => {
          /* already torn down */
        });
      }
      doc = null;
    };
  }, [url]);

  const pageWidth = Math.max(280, Math.floor((frameWidth - 48) * zoom));

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

      <div ref={frameRef} className="min-h-0 flex-1 overflow-auto">
        {status === "loading" ? (
          <div className="flex h-full min-h-[280px] items-center justify-center">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground/50">
              <Loader2 className="h-5 w-5 animate-spin" />
              {t("pdf.loading")}
            </div>
          </div>
        ) : null}
        {status === "error" ? (
          <div className="flex h-full min-h-[280px] items-center justify-center px-6 text-center">
            <p className="max-w-sm text-sm font-semibold text-foreground/60">{t("pdf.error")}</p>
          </div>
        ) : null}
        {status === "ready" ? (
          <div className="flex flex-col items-center gap-4 px-6 py-6">
            {pages.map((page, index) => (
              <PdfPageCanvas key={index} page={page} width={pageWidth} />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function PdfPageCanvas({ page, width }: { page: PdfPageHandle; width: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || width < 1) return;
    const base = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale: width / base.width });
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
  }, [page, width]);

  return (
    <canvas
      ref={canvasRef}
      className="max-w-full rounded-sm bg-white shadow-[0_12px_40px_-18px_rgba(15,23,42,0.45)]"
    />
  );
}
