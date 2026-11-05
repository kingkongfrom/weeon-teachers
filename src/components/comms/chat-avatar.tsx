"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { contactAvatarColor, contactInitial } from "@/lib/comms/chat-display";

/**
 * A circular avatar that walks a chain of candidate images and ends on initials.
 *
 * WHY A CHAIN
 *
 * School leadership is shown as the SCHOOL's logo, but the logo is optional -- a
 * tenant may never have uploaded one, the storage object may be missing, or the URL
 * may be malformed. `loadSchoolLogoUrl` returns null for the first two, but a URL
 * that 404s only fails at render time.
 *
 * With a single `imageUrl`, a broken logo dropped straight to initials and skipped
 * the administrator's own photo, which is the fallback the owner asked for. So the
 * component now takes `imageUrls` and tries each in order:
 *
 *   school logo  ->  the person's avatar  ->  their initials
 *
 * `imageUrl` is kept for the many call sites that only ever have one picture.
 */
export function ChatAvatar({
  name,
  imageUrl,
  imageUrls,
  className,
}: {
  name: string;
  /** Convenience for the common single-image case. */
  imageUrl?: string | null;
  /** Ordered candidates; the first that loads wins. */
  imageUrls?: Array<string | null | undefined>;
  className?: string;
}) {
  const chain = (imageUrls ?? [imageUrl]).filter(
    (url): url is string => typeof url === "string" && url.length > 0,
  );

  // Index of the candidate currently displayed; 0 when the chain is empty.
  const [index, setIndex] = useState(0);
  const current = chain[index];
  const showPhoto = Boolean(current);
  /*
   * A SCHOOL LOGO IS A RECTANGLE, NOT A PHOTO.
   *
   * The uploaded logo is a square PNG with a WHITE background baked into its pixels
   * -- no transparency. Cropping it like a face leaves white corners visible and the
   * avatar reads as a square inside a circle.
   *
   * The ERP already solved this for the account drawer and Ops tiles:
   * `SchoolLogoAvatar` + `logoAvatarScale`. This reuses that geometry rather than
   * inventing another zoom:
   *
   *   clipPath: circle(50%)           -- what actually clips a scaled child
   *   scale: 1.42 + 20/diameter       -- zooms until only the roundel remains
   *
   * `overflow-hidden` + `rounded-full` alone does NOT reliably clip a transformed
   * child, which is why earlier attempts still showed corners.
   */
  const showingLogo = showPhoto && chain.length > 1 && index === 0;
  /*
   * Read the rendered diameter from the caller's size class so the zoom matches the
   * drawer's formula at every size. Falls back to 44px (the common row avatar).
   */
  const diameterPx = (() => {
    const match = /(?:^|\s)(?:h|w)-\[(\d+(?:\.\d+)?)px\]/.exec(className ?? "");
    if (match) return Number(match[1]);
    const scale = /(?:^|\s)(?:h|w)-(\d+)(?:\s|$)/.exec(className ?? "");
    if (scale) return Number(scale[1]) * 4;
    return 44;
  })();
  const logoScale = 1.42 + (10 * 2) / diameterPx;

  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold text-white",
        className,
      )}
      style={
        showingLogo
          ? // White matte under the logo, clipped to the circle, matching the drawer.
            { backgroundColor: "#ffffff", clipPath: "circle(50% at 50% 50%)" }
          : showPhoto
            ? undefined
          : {
              backgroundImage: `linear-gradient(140deg, ${contactAvatarColor(name)}, color-mix(in srgb, ${contactAvatarColor(name)} 62%, #000))`,
            }
      }
      aria-hidden
    >
      {showPhoto ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={current}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          style={showingLogo ? { transform: `scale(${logoScale})` } : undefined}
          // Advance down the chain on failure; past the end, initials render.
          onError={() => setIndex((i) => i + 1)}
        />
      ) : (
        contactInitial(name)
      )}
    </span>
  );
}
