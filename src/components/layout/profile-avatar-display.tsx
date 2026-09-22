"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

type ProfileAvatarDisplayProps = {
  name: string;
  imageUrl?: string | null;
  size?: "sm" | "header" | "md" | "lg";
  className?: string;
};

const SIZE_CLASS = {
  sm: "h-9 w-9 rounded-xl text-xs",
  header: "h-11 w-11 rounded-xl text-sm",
  md: "h-14 w-14 rounded-2xl text-lg",
  lg: "h-[84px] w-[84px] rounded-[1.35rem] text-2xl",
} as const;

const IMAGE_SIZES: Record<NonNullable<ProfileAvatarDisplayProps["size"]>, string> = {
  sm: "36px",
  header: "44px",
  md: "56px",
  lg: "96px",
};

export function ProfileAvatarDisplay({
  name,
  imageUrl,
  size = "md",
  className,
}: ProfileAvatarDisplayProps) {
  const initials = initialsOf(name);
  const sizeClass = SIZE_CLASS[size];
  const frameClass = cn(
    "relative shrink-0 overflow-hidden bg-surface-muted",
    "border-[2.5px] border-foreground/30 shadow-[0_0_0_1px_rgb(16_32_29/0.08),0_1px_3px_rgb(16_32_29/0.12)]",
    "dark:border-white/35 dark:shadow-[0_0_0_1px_rgb(255_255_255/0.12),0_1px_4px_rgb(0_0_0/0.35)]",
    sizeClass,
    className,
  );

  if (imageUrl) {
    return (
      <div className={frameClass}>
        <Image
          src={imageUrl}
          alt=""
          fill
          className="object-cover"
          sizes={IMAGE_SIZES[size]}
          unoptimized
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        frameClass,
        "flex items-center justify-center font-bold text-white brand-gradient",
      )}
      aria-hidden
    >
      {initials}
    </div>
  );
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.charAt(0) ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1].charAt(0) : "";
  return (first + last).toUpperCase() || "W";
}
