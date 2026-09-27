"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { JustificationDecision } from "@/components/attendance/justification-decision";
import type { JustificationInboxItem } from "@/lib/dashboard/justification-inbox";

/** Pending justifications — drops each row as soon as the teacher decides. */
export function JustificationInboxList({
  items,
  locale,
  labels,
}: {
  items: JustificationInboxItem[];
  locale: string;
  labels: {
    guardianNote: string;
    openInRegister: string;
    inboxEmpty: string;
    statuses: Record<string, string>;
  };
}) {
  const router = useRouter();
  const [visible, setVisible] = useState(items);

  useEffect(() => {
    setVisible(items);
  }, [items]);

  function onDecided(recordId: string, _decision: "accepted" | "rejected") {
    setVisible((current) => current.filter((row) => row.recordId !== recordId));
    router.refresh();
  }

  if (visible.length === 0) {
    return <p className="text-sm font-medium text-foreground/60">{labels.inboxEmpty}</p>;
  }

  return (
    <ul className="flex flex-col gap-3">
      {visible.map((item) => (
        <li key={item.recordId} className="rounded-2xl border border-border bg-surface p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">{item.studentName}</p>
              <p className="mt-0.5 text-xs font-medium text-foreground/50">
                {[labels.statuses[item.status], formatDay(item.date, locale), item.groupName]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
            <Link
              href={`/aula-virtual/${item.classId}?tab=asistencia&date=${item.date}`}
              className="text-xs font-semibold text-brand-600"
            >
              {labels.openInRegister}
            </Link>
          </div>
          <p className="mt-3 text-sm text-foreground/80">{item.note}</p>
          {item.attachmentUrl ? (
            item.attachmentPath?.endsWith(".pdf") ? (
              <a
                href={item.attachmentUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-block text-sm font-semibold text-brand-600"
              >
                PDF
              </a>
            ) : (
              <a href={item.attachmentUrl} target="_blank" rel="noreferrer" className="mt-3 inline-block">
                <img
                  src={item.attachmentUrl}
                  alt={labels.guardianNote}
                  className="h-24 w-24 rounded-lg object-cover"
                />
              </a>
            )
          ) : null}
          <div className="mt-3">
            <JustificationDecision recordId={item.recordId} onDecided={onDecided} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function formatDay(iso: string, locale: string): string {
  const date = new Date(`${iso.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "es-CR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}
