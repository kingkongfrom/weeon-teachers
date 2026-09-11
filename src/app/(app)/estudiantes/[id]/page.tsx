import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { fullName, loadTeacherStudent } from "@/lib/dashboard/students";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t.student.title };
}

export default async function StudentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const student = await loadTeacherStudent(id);
  if (!student) notFound();
  const t = await getT();

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="brand-page-title text-3xl text-foreground sm:text-4xl">
          {fullName(student)}
        </h1>
        {student.groups.length > 0 ? (
          <p className="text-sm font-medium text-foreground/55">
            {student.groups.map((group) => group.name).join(" · ")}
          </p>
        ) : null}
      </header>

      <Link
        href="/estudiantes"
        className="-ml-2.5 inline-flex w-fit items-center gap-2 rounded-lg px-2.5 py-1.5 text-base font-semibold text-foreground/70 transition-all hover:bg-surface-muted hover:text-foreground active:scale-[0.98]"
      >
        <ArrowLeft className="h-5 w-5" />
        {t.estudiantes.back}
      </Link>
    </div>
  );
}
