"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/client";
import { AssessmentsPanel } from "@/components/assessments/assessments-panel";
import { MaterialsPanel } from "@/components/classroom/materials-panel";
import { createTopic } from "@/lib/teachers/topics-actions";
import type { AssessmentSummary } from "@/lib/assessments/model";
import type { ClassMaterial } from "@/lib/dashboard/materials";
import type { ClassTopic } from "@/lib/dashboard/topics";

const NONE = "__none";

/** "Trabajo de clase": topic chips (Temas) filter assessments and materials. */
export function ClassworkPanel({
  classId,
  assessments,
  materials,
  topics,
  selectedSubjectId,
  subjects,
  studentCount,
}: {
  classId: string;
  assessments: AssessmentSummary[];
  materials: ClassMaterial[];
  topics: ClassTopic[];
  selectedSubjectId: string | null;
  subjects: { id: string; name: string }[];
  studentCount: number;
}) {
  const t = useT();
  const [selected, setSelected] = useState<string>("all");
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const defaultTopicId = selected !== "all" && selected !== NONE ? selected : null;

  function matches(topicId: string | null): boolean {
    if (selected === "all") return true;
    if (selected === NONE) return topicId == null;
    return topicId === selected;
  }

  /** Classwork is per subject: show only the active subject's items. Unassigned
   * items are not leaked into every subject. */
  function subjectMatches(itemSubjectId: string | null): boolean {
    if (!selectedSubjectId) return true;
    return itemSubjectId === selectedSubjectId;
  }

  const shownAssessments = assessments.filter(
    (item) => matches(item.topicId) && subjectMatches(item.subjectId),
  );
  const shownMaterials = materials.filter(
    (item) => matches(item.topicId) && subjectMatches(item.subjectId),
  );

  async function submitTopic() {
    const value = name.trim();
    if (!value) return;
    setPending(true);
    setError(null);
    const res = await createTopic({ classId, name: value });
    setPending(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setName("");
    setCreating(false);
    if (res.id) setSelected(res.id);
  }

  const chips = [
    { id: "all", label: t.topics.all },
    ...topics.map((topic) => ({ id: topic.id, label: topic.name })),
    { id: NONE, label: t.topics.none },
  ];

  return (
    <div className="flex flex-col gap-6">
      {subjects.length > 1 ? (
        <div className="no-scrollbar flex flex-wrap gap-2">
          {subjects.map((option) => {
            const active = option.id === selectedSubjectId;
            return (
              <Link
                key={option.id}
                href={`/aula-virtual/${classId}?subject=${option.id}&tab=trabajo`}
                className={cn(
                  "rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors",
                  active
                    ? "brand-gradient text-white"
                    : "border border-border text-foreground/60 hover:bg-surface-muted hover:text-foreground",
                )}
              >
                {option.name}
              </Link>
            );
          })}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold uppercase tracking-wide text-foreground/45">
          {t.topics.title}
        </span>
        {chips.map((chip) => (
          <button
            key={chip.id}
            type="button"
            onClick={() => setSelected(chip.id)}
            className={cn(
              "shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition-colors",
              selected === chip.id
                ? "brand-gradient text-white"
                : "border border-border text-foreground/60 hover:bg-surface-muted hover:text-foreground",
            )}
          >
            {chip.label}
          </button>
        ))}

        {creating ? (
          <span className="flex items-center gap-1">
            <input
              autoFocus
              value={name}
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void submitTopic();
                if (event.key === "Escape") {
                  setCreating(false);
                  setName("");
                }
              }}
              maxLength={120}
              placeholder={t.topics.namePlaceholder}
              className="h-8 w-44 rounded-full border border-border bg-background px-3 text-xs text-foreground outline-none focus:border-brand-400"
            />
            <button
              type="button"
              onClick={() => void submitTopic()}
              disabled={pending || name.trim().length === 0}
              className="inline-flex h-8 items-center gap-1 rounded-full brand-gradient px-3 text-xs font-semibold text-white disabled:opacity-50"
            >
              {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              {t.topics.create}
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border px-3 py-1 text-xs font-semibold text-brand-700 transition-colors hover:bg-brand-50 dark:text-brand-300 dark:hover:bg-brand-950/40"
          >
            <Plus className="h-3.5 w-3.5" />
            {t.topics.new}
          </button>
        )}
      </div>

      {error ? <p className="text-sm font-medium text-error">{error}</p> : null}

      <div className="flex flex-col gap-8">
        <AssessmentsPanel
          classId={classId}
          assessments={shownAssessments}
          studentCount={studentCount}
          defaultTopicId={defaultTopicId}
          defaultSubjectId={selectedSubjectId}
        />
        <MaterialsPanel
          classId={classId}
          materials={shownMaterials}
          topics={topics}
          subjects={subjects}
          defaultTopicId={defaultTopicId}
          defaultSubjectId={selectedSubjectId}
        />
      </div>
    </div>
  );
}
