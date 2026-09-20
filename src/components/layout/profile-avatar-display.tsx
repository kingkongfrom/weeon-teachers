"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

type ProfileAvatarDisplayProps = {
  name: string;
  imageUrl?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const SIZE_CLASS = {
  sm: "h-9 w-9 rounded-xl text-xs",
  md: "h-14 w-14 rounded-2xl text-lg",
  lg: "h-[84px] w-[84px] rounded-[1.35rem] text-2xl",
} as const;

export function ProfileAvatarDisplay({
  name,
  imageUrl,
  size = "md",
  className,
}: ProfileAvatarDisplayProps) {
  const initials = initialsOf(name);
  const sizeClass = SIZE_CLASS[size];

  if (imageUrl) {
    return (
      <div
        className={cn(
          "relative shrink-0 overflow-hidden border-2 border-border bg-surface-muted",
          sizeClass,
          className,
        )}
      >
        <Image src={imageUrl} alt="" fill className="object-cover" sizes="96px" unoptimized />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center font-bold text-white brand-gradient",
        sizeClass,
        className,
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
