"use client";

import { useEffect, useRef, useState } from "react";
import { FileText, Loader2 } from "lucide-react";
import { PdfThumb } from "@/components/excursions/pdf-thumb";
import { fetchTeacherCircularThumbnail } from "@/lib/teachers/circular-actions";
import { cn } from "@/lib/utils";

type Thumb = { url: string; kind: "pdf" | "image"; expiresAt: number };

type Loader = typeof fetchTeacherCircularThumbnail;

/**
 * Signed URLs are minted per document and kept module-wide: the list is
 * re-rendered on every filter change and realtime refresh, and re-signing the
 * same document each time was the single biggest cost in the sidebar. The entry
 * is dropped a minute before expiring so a render never races the signature.
 */
const THUMB_TTL_MS = 55 * 60 * 1000;
const thumbCache = new Map<string, Thumb>();
const thumbInFlight = new Map<string, Promise<Thumb | null>>();

function readCache(documentId: string): Thumb | null {
  const entry = thumbCache.get(documentId);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    thumbCache.delete(documentId);
    return null;
  }
  return entry;
}

export function loadCircularThumb(documentId: string, fetchThumb: Loader = fetchTeacherCircularThumbnail) {
  const cached = readCache(documentId);
  if (cached) return Promise.resolve(cached);
  const pending = thumbInFlight.get(documentId);
  if (pending) return pending;
  const request = (async () => {
    try {
      const result = await fetchThumb(documentId);
      if (!result) return null;
      const entry: Thumb = { ...result, expiresAt: Date.now() + THUMB_TTL_MS };
      thumbCache.set(documentId, entry);
      return entry;
    } finally {
      thumbInFlight.delete(documentId);
    }
  })();
  thumbInFlight.set(documentId, request);
  return request;
}

/**
 * Real first-page preview of a circular in the list.
 *
 * Signing a URL costs a request, and rendering a PDF costs a worker render, so
 * neither happens until the row is on screen (IntersectionObserver) or hovered.
 * Both are cached, so scrolling back up is free. Failures fall back to the
 * category-tinted icon, so a circular without a previewable attachment never
 * leaves a hole in the list.
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
  const [visible, setVisible] = useState(() => readCache(documentId) != null);
  const [thumb, setThumb] = useState<Thumb | null>(() => readCache(documentId));
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (thumb) return;
    const node = frameRef.current;
    if (!node) return;
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
  }, [thumb]);

  useEffect(() => {
    if (!visible || thumb) return;
    let cancelled = false;
    void (async () => {
      try {
        const result = await loadCircularThumb(documentId);
        if (cancelled) return;
        if (!result) setFailed(true);
        else setThumb(result);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [visible, documentId, thumb]);

  const tint = categoryColor || "#5e25cc";

  return (
    <span
      ref={frameRef}
      onMouseEnter={() => {
        void loadCircularThumb(documentId);
      }}
      className={cn(
        "relative inline-flex h-[56px] w-[44px] shrink-0 items-center justify-center overflow-hidden rounded-md border border-[var(--wa-border)] bg-white shadow-sm sm:h-[44px] sm:w-[35px] dark:bg-neutral-100",
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
