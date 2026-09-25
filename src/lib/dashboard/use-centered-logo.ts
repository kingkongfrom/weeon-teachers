"use client";

import { useEffect, useState } from "react";

import { centerLogoImage } from "@/lib/dashboard/logo-image";

/** objectURL cache keyed by the stored logo URL. */
const centeredCache = new Map<string, string>();

/**
 * Returns a centered version of the stored logo. Fetches the (public) logo,
 * trims the empty border and re-centers it; falls back to the original URL if
 * the fetch/canvas work fails (e.g. CORS), so it never breaks the UI.
 */
export function useCenteredLogo(url: string | null | undefined): string | null {
  const [value, setValue] = useState<string | null>(url ?? null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await Promise.resolve();
      if (cancelled) return;
      if (!url) {
        setValue(null);
        return;
      }
      const cached = centeredCache.get(url);
      if (cached) {
        setValue(cached);
        return;
      }
      try {
        const response = await fetch(url, { mode: "cors" });
        const blob = await response.blob();
        const file = new File([blob], "logo", { type: blob.type || "image/png" });
        const centered = await centerLogoImage(file);
        const objectUrl = URL.createObjectURL(centered);
        centeredCache.set(url, objectUrl);
        if (!cancelled) setValue(objectUrl);
      } catch {
        if (!cancelled) setValue(url);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [url]);

  return value;
}
