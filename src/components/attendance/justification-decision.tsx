"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useT } from "@/lib/i18n/client";
import { decideAttendanceJustification } from "@/lib/teachers/attendance-actions";
import { Dialog } from "@/components/ui/dialog";
import { ATTENDANCE_COMMENT_MAX } from "@/lib/attendance/model";

/** Accept marks the row justified. Reject requires a reason for the guardian. */
export function JustificationDecision({
  recordId,
  onDecided,
}: {
  recordId: string;
  onDecided?: (recordId: string, decision: "accepted" | "rejected") => void;
}) {
  const t = useT();
  const a = t.attendance;
  const router = useRouter();
  const [busy, setBusy] = useState<"accepted" | "rejected" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  async function accept() {
    setBusy("accepted");
    setError(null);
    const result = await decideAttendanceJustification(recordId, "accepted");
    setBusy(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onDecided?.(recordId, "accepted");
    router.refresh();
  }

  async function confirmReject() {
    const trimmed = rejectReason.trim();
    if (trimmed.length < 3) {
      setError(a.rejectReasonTooShort);
      return;
    }
    setBusy("rejected");
    setError(null);
    const result = await decideAttendanceJustification(recordId, "rejected", trimmed);
    setBusy(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setRejectOpen(false);
    setRejectReason("");
    onDecided?.(recordId, "rejected");
    router.refresh();
  }

  function openReject() {
    setError(null);
    setRejectReason("");
    setRejectOpen(true);
  }

  function closeReject() {
    if (busy !== null) return;
    setRejectOpen(false);
    setError(null);
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => void accept()}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
        >
          {busy === "accepted" ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              {a.saving}
            </>
          ) : (
            a.acceptJustification
          )}
        </button>
        <button
          type="button"
          disabled={busy !== null}
          onClick={openReject}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-foreground/70 disabled:opacity-50"
        >
          {busy === "rejected" && !rejectOpen ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              {a.saving}
            </>
          ) : (
            a.rejectJustification
          )}
        </button>
        {error && !rejectOpen ? (
          <p className="w-full text-xs font-medium text-red-600">{error}</p>
        ) : null}
      </div>

      <Dialog
        open={rejectOpen}
        title={a.rejectJustificationTitle}
        onClose={closeReject}
        footer={
          <>
            <button
              type="button"
              disabled={busy !== null}
              onClick={closeReject}
              className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground/70 disabled:opacity-50"
            >
              {a.rejectCancel}
            </button>
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => void confirmReject()}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-foreground px-4 py-2 text-sm font-bold text-surface disabled:opacity-50"
            >
              {busy === "rejected" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  {a.saving}
                </>
              ) : (
                a.rejectConfirm
              )}
            </button>
          </>
        }
      >
        <p className="mb-3 text-sm text-foreground/70">{a.rejectJustificationHint}</p>
        <label className="block text-xs font-bold uppercase tracking-wide text-foreground/45">
          {a.rejectReasonLabel}
        </label>
        <textarea
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          maxLength={ATTENDANCE_COMMENT_MAX}
          rows={4}
          disabled={busy !== null}
          placeholder={a.rejectReasonPlaceholder}
          className="mt-1.5 w-full rounded-xl border border-border bg-surface-muted px-3 py-2 text-sm text-foreground placeholder:text-foreground/35 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
        />
        {error && rejectOpen ? (
          <p className="mt-2 text-xs font-medium text-red-600">{error}</p>
        ) : null}
      </Dialog>
    </>
  );
}
