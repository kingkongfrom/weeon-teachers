"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { MessageBodyEditor } from "@/components/comms/message-body-editor";
import { Dialog } from "@/components/ui/dialog";
import type { RichTextDoc } from "@/lib/comms/model";
import { messagesTone } from "@/lib/comms/messages-tone";
import { saveMessageMailboxSettings } from "@/lib/teachers/comms-actions";
import { cn } from "@/lib/utils";
import type { MessageMailboxSettings } from "@/lib/dashboard/message-mailbox-settings";
import { useT } from "@/lib/i18n/use-i18n";

export function SignatureDialog({
  open,
  settings,
  onClose,
  onSaved,
}: {
  open: boolean;
  settings: MessageMailboxSettings;
  onClose: () => void;
  onSaved?: (signatureBody: RichTextDoc) => void;
}) {
  const t = useT();
  const [body, setBody] = useState<RichTextDoc>(() => settings.signatureBody);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setBody(settings.signatureBody);
      setError(null);
    }
  }, [open, settings.signatureBody]);

  async function submit() {
    if (saving) return;
    setSaving(true);
    setError(null);
    const res = await saveMessageMailboxSettings({ signatureBody: body });
    setSaving(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    onSaved?.(body);
    onClose();
  }

  return (
    <Dialog
      open={open}
      title={t("comms.signatureTitle")}
      panelClassName="max-w-2xl"
      onClose={onClose}
      footer={
        <div className="flex w-full justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-xl border border-border px-4 text-sm font-semibold text-foreground/70"
          >
            {t("comms.back")}
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
      <div className="flex flex-col gap-3">
        <MessageBodyEditor
          label={t("comms.signatureTitle")}
          value={body}
          onChange={setBody}
          placeholder={t("comms.signaturePlaceholder")}
          editorClassName="min-h-[12rem]"
          inlineEmbeds={false}
        />
        <p className="text-xs font-medium text-foreground/50">{t("comms.signatureHint")}</p>
        {error ? (
          <p className="rounded-lg bg-error/10 px-3 py-2 text-sm font-medium text-error">{error}</p>
        ) : null}
      </div>
    </Dialog>
  );
}
