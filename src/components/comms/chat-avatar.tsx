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
   * The first candidate is the school logo when a chain has more than one entry --
   * that is how the caller expresses "this person represents the institution". The
   * logo gets a light circular backdrop and is contained rather than cropped;
   * everyone else keeps the plain circular crop a face expects.
   */
  const showingLogo = showPhoto && chain.length > 1 && index === 0;

  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold text-white",
        className,
      )}
      style={
        showingLogo
          ? { backgroundColor: "#ffffff" }
          : showPhoto
            ? undefined
          : {
              backgroundImage: `linear-gradient(140deg, ${contactAvatarColor(name)}, color-mix(in srgb, ${contactAvatarColor(name)} 62%, #000))`,
            }
      }
      aria-hidden
    >
      {showPhoto ? (
        /*
         * A SCHOOL LOGO IS A RECTANGLE, NOT A PHOTO.
         *
         * The uploaded logo is a square PNG with a WHITE background baked into its
         * pixels -- no transparency. Two consequences that one rule cannot cover:
         *
         *  - `object-cover` cropped it to the circle but the white corners still
         *    filled the box, so it read as a square inside a circle.
         *  - `object-contain` kept the mark whole but left the white rectangle
         *    visible around it, which is the same square, slightly smaller.
         *
         * So the logo is SCALED UP and clipped by the circular frame: the white
         * margin that would show as corners is pushed outside the circle, and what
         * remains is the roundel itself. `p-[3px]` was doing the opposite -- it
         * guaranteed bare white on every side.
         *
         * Faces are the normal case and keep `object-cover`.
         */
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={current}
          alt=""
          className={cn(
            "h-full w-full",
            showingLogo
              ? "scale-[1.18] rounded-full object-cover object-center"
              : "object-cover",
          )}
          // Advance down the chain on failure; past the end, initials render.
          onError={() => setIndex((i) => i + 1)}
        />
      ) : (
        contactInitial(name)
      )}
    </span>
  );
}
