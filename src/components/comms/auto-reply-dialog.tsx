"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { MessageBodyEditor } from "@/components/comms/message-body-editor";
import { DatePicker } from "@/components/ui/date-picker";
import { Dialog } from "@/components/ui/dialog";
import { docHasContent, type RichTextDoc } from "@/lib/comms/model";
import { messagesTone } from "@/lib/comms/messages-tone";
import { saveMessageMailboxSettings } from "@/lib/teachers/comms-actions";
import type { MessageMailboxSettings } from "@/lib/dashboard/message-mailbox-settings";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/use-i18n";

export function AutoReplyDialog({
  open,
  settings,
  onClose,
  onSaved,
}: {
  open: boolean;
  settings: MessageMailboxSettings;
  onClose: () => void;
  onSaved?: (next: MessageMailboxSettings) => void;
}) {
  const t = useT();
  const [enabled, setEnabled] = useState(settings.autoReplyEnabled);
  const [startDate, setStartDate] = useState(settings.autoReplyStart ?? "");
  const [endDate, setEndDate] = useState(settings.autoReplyEnd ?? "");
  const [body, setBody] = useState<RichTextDoc>(() => settings.autoReplyBody);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setEnabled(settings.autoReplyEnabled);
    setStartDate(settings.autoReplyStart ?? "");
    setEndDate(settings.autoReplyEnd ?? "");
    setBody(settings.autoReplyBody);
    setError(null);
  }, [open, settings]);

  async function submit() {
    if (saving) return;
    if (enabled && !docHasContent(body)) {
      setError(t("comms.autoReplyMessageRequired"));
      return;
    }
    setSaving(true);
    setError(null);
    const res = await saveMessageMailboxSettings({
      autoReplyEnabled: enabled,
      autoReplyStart: startDate.trim() || null,
      autoReplyEnd: endDate.trim() || null,
      autoReplyBody: body,
    });
    setSaving(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    onSaved?.({
      ...settings,
      autoReplyEnabled: enabled,
      autoReplyStart: startDate.trim() || null,
      autoReplyEnd: endDate.trim() || null,
      autoReplyBody: body,
    });
    onClose();
  }

  return (
    <Dialog
      open={open}
      title={t("comms.autoReplyTitle")}
      panelClassName="max-w-2xl"
      onClose={onClose}
      footer={
        <div className="flex w-full justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-xl border border-border px-4 text-sm font-semibold text-foreground/70"
          >
            {t("common.cancel")}
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => void submit()}
            className={cn(
              "inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold disabled:opacity-50",
              messagesTone.primaryButton,
            )}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {t("common.save")}
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-sm font-medium text-foreground/55">{t("comms.autoReplyDescription")}</p>

        <label className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background/60 px-4 py-3">
          <span className="text-sm font-semibold text-foreground">{t("comms.autoReplyEnable")}</span>
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            onClick={() => setEnabled((current) => !current)}
            className={cn(
              "inline-flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors",
              enabled ? messagesTone.toggleOn : "bg-foreground/20",
            )}
          >
            <span
              className={cn(
                "block h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ease-out",
                enabled ? "translate-x-5" : "translate-x-0",
              )}
            />
          </button>
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-foreground">{t("comms.autoReplyStart")}</span>
            <DatePicker
              fullWidth
              value={startDate || null}
              onChange={(next) => setStartDate(next ?? "")}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-foreground">{t("comms.autoReplyEnd")}</span>
            <DatePicker
              fullWidth
              value={endDate || null}
              onChange={(next) => setEndDate(next ?? "")}
            />
          </div>
        </div>

        <MessageBodyEditor
          label={t("comms.autoReplyMessage")}
          value={body}
          onChange={setBody}
          placeholder={t("comms.autoReplyPlaceholder")}
          editorClassName="min-h-[10rem]"
          inlineEmbeds={false}
        />

        {error ? (
          <p className="rounded-lg bg-error/10 px-3 py-2 text-sm font-medium text-error">{error}</p>
        ) : null}
      </div>
    </Dialog>
  );
}
