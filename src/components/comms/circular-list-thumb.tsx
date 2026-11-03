"use client";

import { useEffect, useRef, useState } from "react";
import { FileText, Loader2 } from "lucide-react";
import { PdfThumb } from "@/components/excursions/pdf-thumb";
import { fetchTeacherCircularThumbnail } from "@/lib/teachers/circular-actions";
import { cn } from "@/lib/utils";

type Thumb = { url: string; kind: "pdf" | "image" };

/**
 * Real first-page preview of a circular in the list.
 *
 * Signing a URL costs a request, and rendering a PDF costs a worker render, so
 * neither happens until the row is actually on screen (IntersectionObserver).
 * Failures fall back to the category-tinted icon, so a circular without a
 * previewable attachment never leaves a hole in the list.
 */
export function CircularListThumb({
  documentId,
  categoryColor,
  className,
}: {
  documentId: string;
  categoryColor: string | null;
  className?: string;
}) {
  const frameRef = useRef<HTMLSpanElement>(null);
  const [visible, setVisible] = useState(false);
  const [thumb, setThumb] = useState<Thumb | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const node = frameRef.current;
    if (!node || visible) return;
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    void (async () => {
      try {
        const result = await fetchTeacherCircularThumbnail(documentId);
        if (cancelled) return;
        if (!result) setFailed(true);
        else setThumb({ url: result.url, kind: result.kind });
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [visible, documentId]);

  const tint = categoryColor || "#5e25cc";

  return (
    <span
      ref={frameRef}
      className={cn(
        "relative inline-flex h-[44px] w-[35px] shrink-0 items-center justify-center overflow-hidden rounded-md border border-[var(--wa-border)] bg-white shadow-sm dark:bg-neutral-100",
        className,
      )}
      aria-hidden
    >
      {thumb?.kind === "image" ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={thumb.url} alt="" loading="lazy" className="h-full w-full object-cover" />
      ) : thumb?.kind === "pdf" ? (
        <PdfThumb url={thumb.url} className="rounded-md" />
      ) : (
        <>
          <span className="absolute inset-x-0 top-0 h-1.5" style={{ backgroundColor: tint }} />
          {!failed && visible ? (
            <Loader2 className="h-3 w-3 animate-spin text-neutral-400" />
          ) : (
            <FileText className="h-4 w-4" style={{ color: tint }} />
          )}
        </>
      )}
    </span>
  );
}
