import "server-only";

import { createCanvas } from "@napi-rs/canvas";

/** Longest edge of the generated preview, in pixels. */
const THUMB_MAX = 480;

/**
 * Renders a small PNG preview for a document:
 * - **PDF** → page 1, scaled to fit `THUMB_MAX` (uses `pdfjs-dist` with the
 *   `@napi-rs/canvas` backend — the same pdf.js the mobile reader bundles).
 * - **Image** → the image itself, downscaled.
 * - anything else → `null` (the UI falls back to a file-type tile).
 *
 * Server-only and best-effort: a failure returns `null` and never blocks the
 * upload.
 */
export async function renderThumbnail(
  bytes: Uint8Array,
  mimeType: string | null,
  fileName: string,
): Promise<Buffer | null> {
  try {
    if (mimeType === "application/pdf" || fileName.toLowerCase().endsWith(".pdf")) {
      return await renderPdfPreview(bytes);
    }
    if (mimeType?.startsWith("image/")) {
      return await renderImagePreview(bytes);
    }
    return null;
  } catch (error) {
    console.error("[materials] thumbnail render failed", error);
    return null;
  }
}

async function renderPdfPreview(bytes: Uint8Array): Promise<Buffer | null> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const task = pdfjs.getDocument({
    // Copy into a fresh buffer: pdf.js neuters the array it is given.
    data: new Uint8Array(bytes),
    useSystemFonts: true,
  });
  const doc = await task.promise;
  try {
    const page = await doc.getPage(1);
    const base = page.getViewport({ scale: 1 });
    const scale = Math.min(THUMB_MAX / Math.max(base.width, base.height), 2);
    const viewport = page.getViewport({ scale });

    const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
    const context = canvas.getContext("2d");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);

    // pdf.js v6 wants a DOM canvas; `@napi-rs/canvas` is API-compatible, so we
    // pass it as both `canvas` and `canvasContext` behind casts.
    await page.render({
      canvas: canvas as unknown as HTMLCanvasElement,
      canvasContext: context as unknown as CanvasRenderingContext2D,
      viewport,
    }).promise;

    return canvas.toBuffer("image/png");
  } finally {
    await task.destroy();
  }
}

async function renderImagePreview(bytes: Uint8Array): Promise<Buffer | null> {
  const { loadImage } = await import("@napi-rs/canvas");
  const image = await loadImage(Buffer.from(bytes));
  const scale = Math.min(THUMB_MAX / Math.max(image.width, image.height), 1);
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));

  const canvas = createCanvas(width, height);
  const context = canvas.getContext("2d");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);
  return canvas.toBuffer("image/png");
}
