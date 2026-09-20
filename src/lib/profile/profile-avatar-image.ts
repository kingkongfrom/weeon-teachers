/** Stored avatar edge length in pixels (JPEG). Matches weeon-mobile. */
export const PROFILE_AVATAR_EDGE = 512 as const;

export function profileAvatarStoragePath(tenantId: string, profileId: string): string {
  return `${tenantId}/${profileId}.jpg`;
}

/** Center-square crop, resize, and encode as JPEG in the browser. */
export async function prepareProfileAvatarFromFile(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  try {
    const edge = Math.min(bitmap.width, bitmap.height);
    const sx = (bitmap.width - edge) / 2;
    const sy = (bitmap.height - edge) / 2;

    const canvas = document.createElement("canvas");
    canvas.width = PROFILE_AVATAR_EDGE;
    canvas.height = PROFILE_AVATAR_EDGE;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas_unavailable");

    ctx.drawImage(bitmap, sx, sy, edge, edge, 0, 0, PROFILE_AVATAR_EDGE, PROFILE_AVATAR_EDGE);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", 0.85);
    });
    if (!blob) throw new Error("encode_failed");
    return blob;
  } finally {
    bitmap.close();
  }
}
