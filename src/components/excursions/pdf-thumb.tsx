"use client";

import { useEffect, useRef, useState } from "react";
import { FileText } from "lucide-react";
import { cn } from "@/lib/utils";

/** First page of a PDF, cropped from the top into the square around it. */
export function PdfThumb({ url, className }: { url: string; className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let loading: { destroy: () => Promise<void> } | null = null;
    let renderTask: { cancel: () => void; promise: Promise<void> } | null = null;

    void (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
        const task = pdfjs.getDocument({ url, disableRange: true, disableStream: true });
        loading = task;
        const loaded = await task.promise;
        if (cancelled) return;
        const page = await loaded.getPage(1);
        const canvas = canvasRef.current;
        if (!canvas || cancelled) return;
        const base = page.getViewport({ scale: 1 });
        const scale = 320 / Math.min(base.width, base.height);
        const viewport = page.getViewport({ scale });
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        renderTask = page.render({ canvas, viewport });
        await renderTask.promise;
        if (!cancelled) setFailed(false);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();

    return () => {
      cancelled = true;
      renderTask?.cancel();
      void loading?.destroy().catch(() => {
        /* already torn down */
      });
    };
  }, [url]);

  if (failed) {
    return (
      <span className={cn("flex h-full w-full items-center justify-center bg-surface-muted text-foreground/35", className)}>
        <FileText className="h-5 w-5" strokeWidth={1.6} />
      </span>
    );
  }

  return <canvas ref={canvasRef} className={cn("h-full w-full object-cover object-top", className)} />;
}
