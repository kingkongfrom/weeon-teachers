"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, GraduationCap, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/client";
import { ClassworkPanel } from "@/components/classroom/classwork-panel";
import { StreamPanel } from "@/components/classroom/stream-panel";
import type { TeacherStudent } from "@/lib/dashboard/grupos";
import type { ClassMaterial } from "@/lib/dashboard/materials";
import type { StreamPost } from "@/lib/dashboard/stream";
import type { ClassTopic } from "@/lib/dashboard/topics";
import type { AssessmentSummary } from "@/lib/assessments/model";

type TabId = "novedades" | "trabajo" | "personas" | "calificaciones";

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.charAt(0) ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1].charAt(0) : "";
  return (first + last).toUpperCase() || "W";
}

/** Per-class workspace tabs, mirroring Google Classroom. */
export function ClassTabs({
  classId,
  teacherName,
  students,
  materials,
  assessments,
  stream,
  topics,
  selectedSubjectId,
  subjects,
  initialTab,
}: {
  classId: string;
  teacherName: string;
  students: TeacherStudent[];
  materials: ClassMaterial[];
  assessments: AssessmentSummary[];
  stream: StreamPost[];
  topics: ClassTopic[];
  selectedSubjectId: string | null;
  subjects: { id: string; name: string }[];
  initialTab?: string;
}) {
  const t = useT();
  const VALID_TABS: TabId[] = ["novedades", "trabajo", "personas", "calificaciones"];
  const [tab, setTab] = useState<TabId>(
    VALID_TABS.includes(initialTab as TabId) ? (initialTab as TabId) : "novedades",
  );
  const tabs: { id: TabId; label: string }[] = [
    { id: "novedades", label: t.classroom.tabs.novedades },
    { id: "trabajo", label: t.classroom.tabs.trabajo },
    { id: "personas", label: t.classroom.tabs.personas },
    { id: "calificaciones", label: t.classroom.tabs.calificaciones },
  ];

  return (
    <div className="flex flex-col">
      <div
        role="tablist"
        aria-label={t.classroom.tabs.aria}
        className="no-scrollbar flex gap-1 overflow-x-auto border-b border-border"
      >
        {tabs.map(({ id, label }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(id)}
              className={cn(
                "relative shrink-0 rounded-t-lg px-4 py-3 text-sm font-semibold transition-colors",
                active
                  ? "text-brand-700 dark:text-brand-300"
                  : "text-foreground/55 hover:bg-surface-muted hover:text-foreground",
              )}
            >
              {label}
              {active ? (
                <span
                  aria-hidden
                  className="absolute inset-x-2 -bottom-px h-0.5 rounded-full brand-gradient"
                />
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="pt-5">
        {tab === "novedades" ? (
          <StreamPanel classId={classId} posts={stream} />
        ) : null}

        {tab === "trabajo" ? (
          <ClassworkPanel
            classId={classId}
            assessments={assessments}
            materials={materials}
            topics={topics}
            selectedSubjectId={selectedSubjectId}
            subjects={subjects}
          />
        ) : null}

        {tab === "personas" ? (
          <div className="flex flex-col gap-6">
            <section>
              <h3 className="text-sm font-bold uppercase tracking-wide text-foreground/50">
                {t.classroom.teachers}
              </h3>
              <PersonRow name={teacherName} subtitle={t.classroom.teacherFallback} tone="brand" />
            </section>

            <section>
              <h3 className="text-sm font-bold uppercase tracking-wide text-foreground/50">
                {t.classroom.studentsHeading(students.length)}
              </h3>
              {students.length === 0 ? (
                <p className="mt-3 text-sm font-medium text-foreground/50">
                  {t.classroom.noStudents}
                </p>
              ) : (
                <ul className="mt-1 flex flex-col divide-y divide-border">
                  {students.map((student) => (
                    <li key={student.id}>
                      <PersonRow
                        name={`${student.lastName} ${student.firstName}`.trim()}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        ) : null}

        {tab === "calificaciones" ? (
          <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-surface p-5">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-light text-accent dark:bg-accent/15">
                <GraduationCap className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-bold text-foreground">{t.classroom.gradebookTitle}</p>
                <p className="mt-0.5 text-xs font-medium text-foreground/50">
                  {t.classroom.gradebookBody}
                </p>
              </div>
            </div>
            <Link
              href={`/grupos/${classId}`}
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm font-semibold text-brand-600 transition-colors hover:border-brand-200 hover:bg-brand-50 dark:text-brand-300 dark:hover:bg-brand-950/40"
            >
              {t.classroom.openGrades}
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </section>
        ) : null}
      </div>
    </div>
  );
}

function PersonRow({
  name,
  subtitle,
  tone = "muted",
}: {
  name: string;
  subtitle?: string | null;
  tone?: "brand" | "muted";
}) {
  return (
    <div className="flex items-center gap-3 px-1 py-3">
      <span
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white",
          tone === "brand" ? "brand-gradient" : "bg-foreground/30",
        )}
      >
        {initialsOf(name)}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold text-foreground">{name}</span>
        {subtitle ? (
          <span className="block truncate text-xs font-medium text-foreground/50">{subtitle}</span>
        ) : null}
      </span>
      {tone === "brand" ? (
        <Users className="ml-auto h-4 w-4 text-foreground/30" aria-hidden />
      ) : null}
    </div>
  );
}
