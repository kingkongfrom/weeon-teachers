"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import {
  FOLDER_COLOR_PRESETS,
  isFolderColorPresetSelected,
} from "@/components/comms/new-folder-dialog";
import { createTeacherCircularCategory } from "@/lib/teachers/circular-actions";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/use-i18n";

/** Create a circular category (teacher-scoped; shares the school's categories). */
export function NewCategoryDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated?: (categoryId: string) => void;
}) {
  const t = useT();
  const [name, setName] = useState("");
  const [color, setColor] = useState<string>(FOLDER_COLOR_PRESETS[1]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setName("");
    setColor(FOLDER_COLOR_PRESETS[1]);
    setError(null);
  }

  async function submit() {
    if (saving) return;
    setSaving(true);
    setError(null);
    const normalized = color.match(/^#[0-9A-Fa-f]{6}$/) ? color : FOLDER_COLOR_PRESETS[1];
    const res = await createTeacherCircularCategory({ name, color: normalized });
    setSaving(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    if (res.categoryId) onCreated?.(res.categoryId);
    reset();
    onClose();
  }

  return (
    <Dialog
      open={open}
      title={t("comms.documents.newCategoryTitle")}
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
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-[#5e25cc] to-[#2b59ff] px-4 text-sm font-semibold text-white disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {t("comms.documents.createCategory")}
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold text-foreground">
            {t("comms.documents.categoryName")}
          </span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={t("comms.documents.categoryNamePlaceholder")}
            maxLength={60}
            autoFocus
            className="h-11 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-[#5e25cc] focus:ring-2 focus:ring-[#5e25cc]/25"
          />
        </label>

        <div className="flex flex-col gap-2">
          <span className="text-sm font-semibold text-foreground">{t("comms.folderColor")}</span>
          <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-label={t("comms.folderColor")}>
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
        </div>

        {error ? (
          <p className="rounded-lg bg-error/10 px-3 py-2 text-sm font-medium text-error">{error}</p>
        ) : null}
      </div>
    </Dialog>
  );
}
