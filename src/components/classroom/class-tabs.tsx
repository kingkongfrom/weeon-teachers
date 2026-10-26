"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, ChevronRight, GraduationCap, HandHeart } from "lucide-react";
import { fetchClassEducationalSupportFlags } from "@/lib/teachers/educational-support-actions";
import type { ClassEducationalSupportFlags } from "@/lib/educational-supports/model";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/client";
import { ClassHeader } from "@/components/classroom/class-header";
import { hubToneSurface, TONE_AVATAR } from "@/lib/dashboard/tones";
import { ProfileAvatarDisplay } from "@/components/layout/profile-avatar-display";
import { ClassworkPanel } from "@/components/classroom/classwork-panel";
import { ExamDatesPanel } from "@/components/assessments/exam-dates-panel";
import { AttendanceRegister } from "@/components/attendance/attendance-register";
import type { AttendanceEntry } from "@/lib/attendance/model";
import type { TeacherStudent } from "@/lib/dashboard/grupos";
import type { ClassLessonDay, ExamDate } from "@/lib/dashboard/exam-dates";
import type { ClassMaterial } from "@/lib/dashboard/materials";
import type { AssessmentSummary } from "@/lib/assessments/model";

type TabId = "trabajo" | "examenes" | "personas" | "asistencia" | "calificaciones";

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
  teacherAvatarUrl = null,
  students,
  materials,
  assessments,
  examDates = [],
  lessonDays = [],
  selectedSubjectId,
  subjects,
  initialTab,
  attendanceDate,
  attendanceLessonId,
  attendanceMarks,
  pendingJustifications = 0,
  className,
  schoolName,
  year,
}: {
  classId: string;
  teacherName: string;
  teacherAvatarUrl?: string | null;
  students: TeacherStudent[];
  materials: ClassMaterial[];
  assessments: AssessmentSummary[];
  examDates?: ExamDate[];
  lessonDays?: ClassLessonDay[];
  selectedSubjectId: string | null;
  subjects: { id: string; name: string }[];
  initialTab?: string;
  attendanceDate: string;
  attendanceLessonId: string | null;
  attendanceMarks: Record<string, AttendanceEntry>;
  pendingJustifications?: number;
  /** Class name shown in the command header. */
  className: string;
  schoolName: string | null;
  year: number;
}) {
  const t = useT();
  const VALID_TABS: TabId[] = ["trabajo", "personas", "asistencia", "calificaciones", "examenes"];
  const [tab, setTab] = useState<TabId>(
    VALID_TABS.includes(initialTab as TabId) ? (initialTab as TabId) : "trabajo",
  );
  const [justificationBadge, setJustificationBadge] = useState(pendingJustifications);
  const [supportFlags, setSupportFlags] = useState<ClassEducationalSupportFlags>({});

  // Supports are per subject; the roster badge uses the class subject so a
  // student with an accommodation is visible before opening any gradebook.
  useEffect(() => {
    let active = true;
    void fetchClassEducationalSupportFlags({
      classId,
      subjectId: selectedSubjectId,
    }).then((res) => {
      if (active && res.ok) setSupportFlags(res.flags);
    });
    return () => {
      active = false;
    };
  }, [classId, selectedSubjectId]);

  useEffect(() => {
    setJustificationBadge(pendingJustifications);
  }, [pendingJustifications]);

  const tabs: { id: TabId; label: string }[] = [
    { id: "trabajo", label: t.classroom.tabs.trabajo },
    { id: "examenes", label: t.classroom.tabs.examenes },
    { id: "personas", label: t.classroom.tabs.personas },
    { id: "asistencia", label: t.classroom.tabs.asistencia },
    { id: "calificaciones", label: t.classroom.tabs.calificaciones },
  ];

  const header = (
    <ClassHeader
      classId={classId}
      className={className}
      schoolName={schoolName}
      year={year}
      studentCount={students.length}
      tabs={tabs}
      activeTab={tab}
      onTabChange={setTab}
      justificationBadge={justificationBadge}
    />
  );

  return (
    <div className="flex flex-col gap-5">
      {header}
      <div>
        {tab === "trabajo" ? (
          <ClassworkPanel
            classId={classId}
            assessments={assessments}
            materials={materials}
              selectedSubjectId={selectedSubjectId}
            subjects={subjects}
            studentCount={students.length}
          />
        ) : null}

        {tab === "examenes" ? (
          <ExamDatesPanel
            classId={classId}
            examDates={examDates}
            lessonDays={
              selectedSubjectId
                ? lessonDays.filter((lesson) => lesson.subjectId === selectedSubjectId)
                : lessonDays
            }
            materials={materials}
            subjects={subjects}
            selectedSubjectId={selectedSubjectId}
          />
        ) : null}

        {tab === "personas" ? (
          <div className="flex flex-col gap-6">
            <section>
              <h3 className="text-sm font-bold uppercase tracking-wide text-foreground/50">
                {t.classroom.teachers}
              </h3>
              <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <li>
                  <PersonCard
                    name={teacherName}
                    subtitle={t.classroom.teacherFallback}
                    imageUrl={teacherAvatarUrl}
                  />
                </li>
              </ul>
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
                <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {students.map((student) => (
                    <li key={student.id}>
                      <PersonCard
                        name={`${student.lastName} ${student.firstName}`.trim()}
                        imageUrl={student.avatarUrl}
                        supportCount={supportFlags[student.id]?.activeCount ?? 0}
                        href={`/estudiantes/${student.id}?from=${encodeURIComponent(`/aula-virtual/${classId}?tab=personas`)}`}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        ) : null}

        {tab === "asistencia" ? (
          <div className="flex flex-col gap-4">
            {justificationBadge > 0 ? (
              <Link
                href="/aula-virtual/justificaciones"
                className={cn(
                  "flex items-center gap-3 rounded-2xl px-4 py-3 transition-colors",
                  hubToneSurface("rose"),
                )}
              >
                <span className={cn("flex h-9 min-w-9 shrink-0 items-center justify-center rounded-full px-2 text-xs font-bold text-white", TONE_AVATAR.rose)}>
                  {justificationBadge > 9 ? "9+" : justificationBadge}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold">
                    {t.attendance.inboxTitle}
                  </p>
                  <p className="text-xs font-medium opacity-80">
                    {t.panel.attention.justifications(justificationBadge)}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 opacity-60" />
              </Link>
            ) : null}
            <AttendanceRegister
              key={attendanceDate}
              classId={classId}
              date={attendanceDate}
              lessonId={attendanceLessonId}
              students={students}
              initialMarks={attendanceMarks}
            />
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

function PersonCard({
  name,
  subtitle,
  imageUrl,
  href,
  supportCount = 0,
}: {
  name: string;
  subtitle?: string | null;
  imageUrl?: string | null;
  href?: string;
  /** Active Apoyos Eduativos, shown as a discreet badge next to the name. */
  supportCount?: number;
}) {
  const t = useT();
  const content = (
    <div
      className={cn(
        "flex h-full items-center gap-3 rounded-2xl border border-border bg-surface p-3",
        href &&
          "transition-colors hover:border-brand-200 hover:bg-brand-50/40 dark:hover:bg-brand-950/20",
      )}
    >
      {imageUrl !== undefined ? (
        <ProfileAvatarDisplay name={name} imageUrl={imageUrl} size="md" className="rounded-full" />
      ) : (
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-foreground/30 text-xs font-bold text-white">
          {initialsOf(name)}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="truncate text-sm font-semibold text-foreground">{name}</span>
          {supportCount > 0 ? (
            <span
              title={t.educationalSupports.sectionTitle}
              className="inline-flex h-5 shrink-0 items-center gap-1 rounded-full bg-brand-50 px-1.5 text-[10px] font-bold text-brand-700 dark:bg-brand-950/40 dark:text-brand-300"
            >
              <HandHeart className="h-3 w-3" strokeWidth={2.5} />
              {supportCount}
            </span>
          ) : null}
        </span>
        {subtitle ? (
          <span className="block truncate text-xs font-medium text-foreground/50">{subtitle}</span>
        ) : null}
      </span>
    </div>
  );

  return href ? (
    <Link href={href} className="block h-full">
      {content}
    </Link>
  ) : (
    content
  );
}
