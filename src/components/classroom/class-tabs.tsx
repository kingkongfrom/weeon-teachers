"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRight, ClipboardList, GraduationCap, Megaphone, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TeacherStudent } from "@/lib/dashboard/grupos";

type TabId = "novedades" | "trabajo" | "personas" | "calificaciones";

const TABS: { id: TabId; label: string }[] = [
  { id: "novedades", label: "Novedades" },
  { id: "trabajo", label: "Trabajo de clase" },
  { id: "personas", label: "Personas" },
  { id: "calificaciones", label: "Calificaciones" },
];

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
}: {
  classId: string;
  teacherName: string;
  students: TeacherStudent[];
}) {
  const [tab, setTab] = useState<TabId>("novedades");

  return (
    <div className="flex flex-col">
      <div
        role="tablist"
        aria-label="Secciones de la clase"
        className="no-scrollbar flex gap-1 overflow-x-auto border-b border-border"
      >
        {TABS.map(({ id, label }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(id)}
              className={cn(
                "relative shrink-0 px-4 py-3 text-sm font-semibold transition-colors",
                active
                  ? "text-brand-700 dark:text-brand-300"
                  : "text-foreground/55 hover:text-foreground",
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
          <EmptyState
            icon={<Megaphone className="h-6 w-6" />}
            title="Aún no hay publicaciones"
            body="Aquí verás los anuncios y las tareas que compartas con la clase."
          />
        ) : null}

        {tab === "trabajo" ? (
          <EmptyState
            icon={<ClipboardList className="h-6 w-6" />}
            title="Aún no hay tareas ni materiales"
            body="Las tareas, materiales y temas de esta clase aparecerán aquí."
          />
        ) : null}

        {tab === "personas" ? (
          <div className="flex flex-col gap-6">
            <section>
              <h3 className="text-sm font-bold uppercase tracking-wide text-foreground/50">
                Docentes
              </h3>
              <PersonRow name={teacherName} subtitle="Docente" tone="brand" />
            </section>

            <section>
              <h3 className="text-sm font-bold uppercase tracking-wide text-foreground/50">
                Estudiantes · {students.length}
              </h3>
              {students.length === 0 ? (
                <p className="mt-3 text-sm font-medium text-foreground/50">
                  Esta clase no tiene estudiantes inscritos.
                </p>
              ) : (
                <ul className="mt-1 flex flex-col divide-y divide-border">
                  {students.map((student) => (
                    <li key={student.id}>
                      <PersonRow
                        name={`${student.lastName} ${student.firstName}`.trim()}
                        subtitle={student.grade}
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
                <p className="text-sm font-bold text-foreground">Libro de notas</p>
                <p className="mt-0.5 text-xs font-medium text-foreground/50">
                  Agrega evaluaciones y registra las calificaciones de esta clase.
                </p>
              </div>
            </div>
            <Link
              href={`/grupos/${classId}`}
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm font-semibold text-brand-600 transition-colors hover:border-brand-200 hover:bg-brand-50 dark:text-brand-300 dark:hover:bg-brand-950/40"
            >
              Abrir calificaciones
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </section>
        ) : null}
      </div>
    </div>
  );
}

function EmptyState({
  icon,
  title,
  body,
}: {
  icon: ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-border px-6 py-14 text-center">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-surface-muted text-foreground/50">
        {icon}
      </span>
      <p className="mt-4 text-sm font-semibold text-foreground">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-xs font-medium text-foreground/50">{body}</p>
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
