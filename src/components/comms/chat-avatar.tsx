"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { contactAvatarColor, contactInitial } from "@/lib/comms/chat-display";

export function ChatAvatar({
  name,
  imageUrl,
  className,
}: {
  name: string;
  imageUrl?: string | null;
  className?: string;
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const showPhoto = Boolean(imageUrl) && failedSrc !== imageUrl;

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold text-white",
        className,
      )}
      style={
        showPhoto
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
          src={imageUrl ?? ""}
          alt=""
          className="h-full w-full object-cover"
          onError={() => setFailedSrc(imageUrl ?? null)}
        />
      ) : (
        contactInitial(name)
      )}
    </span>
  );
}
