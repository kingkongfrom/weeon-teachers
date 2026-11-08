"use client";

import { useEffect, useRef, useState } from "react";
import { FolderOpen, MoreHorizontal, Paperclip } from "lucide-react";
import { CloudImportSources } from "@/components/comms/cloud-import-sources";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/use-i18n";

/**
 * PHONE ATTACH CONTROL — one paperclip, everything behind it.
 *
 * On a phone the full attachment strip was hidden because its two rows cost more
 * height than the composer could spare, which left NO way to attach anything.
 * This puts the same two sources behind a single toolbar button:
 *
 *   Mi dispositivo  -> the shared hidden <input type=file> (the same ref the
 *                      strip uses, so there is one input, not two)
 *   Cloud drives    -> CloudImportSources, which is what the strip rendered
 *
 * Deliberately a sibling of the strip rather than a replacement: the strip still
 * owns the file input, the attachment chips and the allow-replies switch from
 * `sm` up. Nothing here duplicates state — both call the composer's own
 * `onAddFiles` / `onCloudError`.
 */
export function ComposeAttachMenu({
  onPickDevice,
  onAddFiles,
  onCloudError,
  remainingAttachmentSlots,
  disabled,
}: {
  /** Clicks the composer's shared file input. */
  onPickDevice: () => void;
  onAddFiles: (files: FileList | File[]) => void;
  onCloudError: (message: string | null) => void;
  remainingAttachmentSlots: number;
  disabled: boolean;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  /*
   * Close on outside click / Escape. A popover that only closes by re-tapping its
   * own trigger strands the user on a phone, where there is no hover-out.
   */
  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={t("comms.attachMenu")}
        title={t("comms.attachMenu")}
        className="inline-flex h-9 w-9 items-center justify-center rounded-full text-foreground/65 hover:bg-surface-muted hover:text-foreground disabled:opacity-40"
      >
        <Paperclip className="h-[18px] w-[18px] shrink-0" />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute bottom-full left-0 z-50 mb-1.5 min-w-[13rem] overflow-hidden rounded-xl border border-border bg-surface p-1 shadow-lg"
        >
          <button
            type="button"
            role="menuitem"
            disabled={remainingAttachmentSlots <= 0}
            onClick={() => {
              onCloudError(null);
              onPickDevice();
              setOpen(false);
            }}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2.5 text-left text-sm font-semibold text-foreground/85 hover:bg-surface-muted disabled:opacity-40"
          >
            <FolderOpen className="h-4 w-4 shrink-0" />
            {t("comms.myDevice")}
          </button>
          {/* The drives render inline; CloudImportSources brings its own buttons. */}
          <div className="px-1 pb-0.5 pt-1">
            <CloudImportSources
              compact
              remainingSlots={remainingAttachmentSlots}
              disabled={disabled}
              onLocalFiles={(next) => {
                onAddFiles(next);
                setOpen(false);
              }}
              onError={(message) => onCloudError(message)}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
