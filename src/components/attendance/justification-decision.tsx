"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/lib/i18n/client";
import { decideAttendanceJustification } from "@/lib/teachers/attendance-actions";

/** Accept marks the row justified. Reject keeps the unjustified mark. */
export function JustificationDecision({ recordId }: { recordId: string }) {
  const t = useT();
  const a = t.attendance;
  const router = useRouter();
  const [busy, setBusy] = useState<"accepted" | "rejected" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function choose(decision: "accepted" | "rejected") {
    setBusy(decision);
    setError(null);
    const result = await decideAttendanceJustification(recordId, decision);
    setBusy(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={busy !== null}
        onClick={() => void choose("accepted")}
        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
      >
        {busy === "accepted" ? "…" : a.acceptJustification}
      </button>
      <button
        type="button"
        disabled={busy !== null}
        onClick={() => void choose("rejected")}
        className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-foreground/70 disabled:opacity-50"
      >
        {busy === "rejected" ? "…" : a.rejectJustification}
      </button>
      {error ? <p className="text-xs font-medium text-red-600">{error}</p> : null}
    </div>
  );
}
