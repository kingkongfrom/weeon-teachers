import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { fullName, loadTeacherStudent } from "@/lib/dashboard/students";

export const metadata: Metadata = {
  title: "Estudiante",
};

export default async function StudentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const student = await loadTeacherStudent(id);
  if (!student) notFound();

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="brand-page-title text-2xl text-foreground sm:text-3xl">
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
        className="inline-flex w-fit items-center gap-1 text-sm font-medium text-brand-700 transition-colors hover:text-brand-800 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        Estudiantes
      </Link>
    </div>
  );
}
