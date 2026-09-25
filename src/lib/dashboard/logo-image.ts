"use client";

/**
 * Smart logo normalisation for the school logo upload.
 *
 * Many school logos are round (or have uniform padding), so a square frame
 * leaves empty corners. Before uploading we trim the transparent / uniform
 * border off the image and re-center the content inside a square canvas with a
 * small margin. The result is what the circular avatar frames display.
 */

const ALPHA_THRESHOLD = 16;
const COLOR_TOLERANCE = 42;
const MARGIN_RATIO = 0.06;

type RGB = { r: number; g: number; b: number };

function colorDistance(px: Uint8ClampedArray, index: number, rgb: RGB): number {
  const dr = px[index] - rgb.r;
  const dg = px[index + 1] - rgb.g;
  const db = px[index + 2] - rgb.b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

/**
 * Dominant non-transparent colour along the image border. Handles white logos
 * with transparent (rounded) corners by sampling every border pixel, not just
 * the four corners.
 */
function borderBackground(px: Uint8ClampedArray, width: number, height: number): RGB | null {
  const buckets = new Map<string, { count: number; sum: RGB }>();
  let border = 0;

  const sample = (x: number, y: number) => {
    const index = (y * width + x) * 4;
    if (px[index + 3] <= ALPHA_THRESHOLD) return;
    border += 1;
    const r = px[index];
    const g = px[index + 1];
    const b = px[index + 2];
    const key = `${r >> 4}-${g >> 4}-${b >> 4}`;
    const bucket = buckets.get(key) ?? { count: 0, sum: { r: 0, g: 0, b: 0 } };
    bucket.count += 1;
    bucket.sum.r += r;
    bucket.sum.g += g;
    bucket.sum.b += b;
    buckets.set(key, bucket);
  };

  for (let x = 0; x < width; x += 1) {
    sample(x, 0);
    sample(x, height - 1);
  }
  for (let y = 0; y < height; y += 1) {
    sample(0, y);
    sample(width - 1, y);
  }

  if (border === 0) return null;

  let best: { count: number; sum: RGB } | null = null;
  for (const bucket of buckets.values()) {
    if (!best || bucket.count > best.count) best = bucket;
  }
  // Only treat it as a background if a single colour dominates the border.
  if (!best || best.count / border < 0.5) return null;

  return {
    r: Math.round(best.sum.r / best.count),
    g: Math.round(best.sum.g / best.count),
    b: Math.round(best.sum.b / best.count),
  };
}

function isBackground(px: Uint8ClampedArray, index: number, background: RGB | null): boolean {
  if (px[index + 3] <= ALPHA_THRESHOLD) return true;
  if (!background) return false;
  return colorDistance(px, index, background) < COLOR_TOLERANCE;
}

async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement | null> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file);
    } catch {
      // fall through to the <img> path
    }
  }
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    image.src = url;
  });
}

/**
 * Trim the empty border and re-center the logo in a square PNG.
 * Falls back to the original file when anything goes wrong.
 */
export async function centerLogoImage(file: File): Promise<File> {
  if (typeof document === "undefined") return file;
  try {
    const bitmap = await loadBitmap(file);
    if (!bitmap) return file;

    const width = "width" in bitmap ? bitmap.width : 0;
    const height = "height" in bitmap ? bitmap.height : 0;
    if (!width || !height) return file;

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0);
    const { data: px } = ctx.getImageData(0, 0, width, height);

    // Dominant border colour is the background (works for transparent PNGs and
    // white/rounded-square logos alike).
    const background = borderBackground(px, width, height);

    // A row/column is empty when every pixel is background (or transparent).
    const rowEmpty = new Array<boolean>(height).fill(true);
    const colEmpty = new Array<boolean>(width).fill(true);
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const index = (y * width + x) * 4;
        if (isBackground(px, index, background)) continue;
        rowEmpty[y] = false;
        colEmpty[x] = false;
      }
    }

    let minX = 0;
    while (minX < width && colEmpty[minX]) minX += 1;
    let maxX = width - 1;
    while (maxX >= 0 && colEmpty[maxX]) maxX -= 1;
    let minY = 0;
    while (minY < height && rowEmpty[minY]) minY += 1;
    let maxY = height - 1;
    while (maxY >= 0 && rowEmpty[maxY]) maxY -= 1;

    if (maxX < minX || maxY < minY) return file;

    const contentWidth = maxX - minX + 1;
    const contentHeight = maxY - minY + 1;
    const size = Math.max(contentWidth, contentHeight);
    const margin = Math.round(size * MARGIN_RATIO);
    const output = size + margin * 2;

    const square = document.createElement("canvas");
    square.width = output;
    square.height = output;
    const squareCtx = square.getContext("2d");
    if (!squareCtx) return file;

    squareCtx.imageSmoothingEnabled = true;
    squareCtx.drawImage(
      canvas,
      minX,
      minY,
      contentWidth,
      contentHeight,
      (output - contentWidth) / 2,
      (output - contentHeight) / 2,
      contentWidth,
      contentHeight,
    );

    const blob = await new Promise<Blob | null>((resolve) =>
      square.toBlob((value) => resolve(value), "image/png"),
    );
    if (!blob) return file;

    return new File([blob], "logo.png", { type: "image/png" });
  } catch {
    return file;
  }
}
