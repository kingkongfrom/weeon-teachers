"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { messagesTone } from "@/lib/comms/messages-tone";
import { createMessageLabel } from "@/lib/teachers/comms-actions";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/use-i18n";

export const FOLDER_COLOR_PRESETS = [
  "#5D87FF",
  "#0f766e",
  "#9333ea",
  "#f59e0b",
  "#ef4444",
  "#ec4899",
  "#64748b",
] as const;

export function isFolderColorPresetSelected(current: string, preset: string): boolean {
  return current.trim().toUpperCase() === preset.toUpperCase();
}

export function NewFolderDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated?: (labelId: string) => void;
}) {
  const t = useT();
  const [name, setName] = useState("");
  const [color, setColor] = useState<string>(FOLDER_COLOR_PRESETS[0]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setName("");
    setColor(FOLDER_COLOR_PRESETS[0]);
    setError(null);
  }

  async function submit() {
    if (saving) return;
    setSaving(true);
    setError(null);
    const normalized = color.match(/^#[0-9A-Fa-f]{6}$/) ? color : FOLDER_COLOR_PRESETS[0];
    const res = await createMessageLabel({ name, color: normalized });
    setSaving(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    if (res.labelId) onCreated?.(res.labelId);
    reset();
    onClose();
  }

  return (
    <Dialog
      open={open}
      title={t("comms.newFolderTitle")}
      onClose={() => {
        reset();
        onClose();
      }}
      footer={
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              reset();
              onClose();
            }}
            className="h-10 rounded-xl border border-border px-4 text-sm font-semibold text-foreground/70"
          >
            {t("common.cancel")}
          </button>
          <button
            type="button"
            disabled={!name.trim() || saving}
            onClick={() => void submit()}
            className={cn(
              "inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold disabled:opacity-50",
              messagesTone.primaryButton,
            )}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {t("comms.createFolder")}
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold text-foreground">{t("comms.folderName")}</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={t("comms.folderNamePlaceholder")}
            maxLength={60}
            autoFocus
            className="h-11 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/25"
          />
        </label>

        <div className="flex flex-col gap-2">
          <span className="text-sm font-semibold text-foreground">{t("comms.folderColor")}</span>
          <div
            className="flex flex-wrap items-center gap-2"
            role="radiogroup"
            aria-label={t("comms.folderColor")}
          >
            {FOLDER_COLOR_PRESETS.map((preset) => {
              const selected = isFolderColorPresetSelected(color, preset);
              return (
                <button
                  key={preset}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  aria-label={preset}
                  onClick={() => setColor(preset)}
                  className={cn(
                    "h-8 w-8 rounded-lg border-2 transition-all hover:scale-105",
                    selected
                      ? "scale-110 border-foreground ring-2 ring-foreground/20 ring-offset-2 ring-offset-background"
                      : "border-transparent opacity-85 hover:opacity-100",
                  )}
                  style={{ backgroundColor: preset }}
                />
              );
            })}
          </div>
          <div className="flex items-center gap-2">
            <span
              className="h-10 w-10 shrink-0 rounded-lg border border-border"
              style={{ backgroundColor: color.match(/^#[0-9A-Fa-f]{6}$/) ? color : FOLDER_COLOR_PRESETS[0] }}
            />
            <input
              value={color}
              onChange={(event) => setColor(event.target.value.toUpperCase())}
              maxLength={7}
              className="h-11 flex-1 rounded-xl border border-border bg-background px-3 font-mono text-sm uppercase outline-none focus:border-brand-400"
            />
          </div>
        </div>

        {error ? (
          <p className="rounded-lg bg-error/10 px-3 py-2 text-sm font-medium text-error">{error}</p>
        ) : null}
      </div>
    </Dialog>
  );
}
