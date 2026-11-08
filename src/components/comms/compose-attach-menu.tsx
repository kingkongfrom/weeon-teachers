"use client";

import { useEffect, useRef, useState } from "react";
import { FolderOpen, Paperclip } from "lucide-react";
import { CloudImportSources } from "@/components/comms/cloud-import-sources";
import { useT } from "@/lib/i18n/use-i18n";

/**
 * PHONE ATTACH CONTROL — one paperclip, everything behind it.
 *
 * On a phone the full attachment strip is hidden because its rows cost more
 * height than the composer can spare, which left no way to attach anything. This
 * puts the same two sources behind a single toolbar button:
 *
 *   Mi dispositivo  -> the composer's shared hidden <input type=file>
 *   Cloud drives    -> CloudImportSources, the component the strip rendered
 *
 * FIXED-POSITIONED ON PURPOSE.
 *
 * The button lives inside the editor toolbar, which sits inside a scrolling
 * container (`overflow-y-auto`). An absolutely positioned popover there is clipped
 * by that ancestor, and the owner saw exactly that: tapping the paperclip showed
 * nothing. `position: fixed` with a rect measured from the button escapes the
 * clipping — no portal, no scroll tracking, and the menu opens directly under the
 * control.
 *
 * It closes on outside pointerdown, Escape, and any scroll or resize: a fixed
 * popover would otherwise stay put while its anchor moved away.
 */
export function ComposeAttachMenu({
  onPickDevice,
  onAddFiles,
  onCloudError,
  remainingAttachmentSlots,
  disabled,
}: {
  onPickDevice: () => void;
  onAddFiles: (files: FileList | File[]) => void;
  onCloudError: (message: string | null) => void;
  remainingAttachmentSlots: number;
  disabled: boolean;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<{ left: number; top: number; bottom: number } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const place = () => {
    const rect = rootRef.current?.getBoundingClientRect();
    if (rect) setAnchor({ left: rect.left, top: rect.top, bottom: rect.bottom });
  };

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target) && !menuRef.current?.contains(target)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const onScroll = () => setOpen(false);
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [open]);

  /* Open downward when there is room below the button, otherwise upward. */
  const menuHeight = 132;
  const opensBelow = anchor ? anchor.bottom + menuHeight + 8 < window.innerHeight : true;

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!open) place();
          setOpen((current) => !current);
        }}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={t("comms.attachMenu")}
        title={t("comms.attachMenu")}
        className="inline-flex h-9 w-9 items-center justify-center rounded-full text-foreground/65 hover:bg-surface-muted hover:text-foreground disabled:opacity-40"
      >
        <Paperclip className="h-[18px] w-[18px] shrink-0" />
      </button>

      {open && anchor ? (
        <div
          ref={menuRef}
          role="menu"
          style={{
            position: "fixed",
            left: Math.min(anchor.left, Math.max(8, window.innerWidth - 220)),
            ...(opensBelow
              ? { top: anchor.bottom + 6 }
              : { bottom: window.innerHeight - anchor.top + 6 }),
          }}
          className="z-[60] min-w-[13rem] overflow-hidden rounded-xl border border-border bg-surface p-1 shadow-lg"
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
