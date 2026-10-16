import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { TeacherCircularsWorkspace } from "@/components/comms/teacher-circulars-workspace";
import { loadCommsGroups } from "@/lib/dashboard/comms-groups";
import {
  loadCircularCategories,
  loadTeacherCirculars,
} from "@/lib/dashboard/teacher-circulars";
import { getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t.circulares.title };
}

/** Teacher circulares: official PDF notices to the teacher's own groups. */
export default async function TeacherCircularesPage() {
  const t = await getT();
  const [circulars, groups, categories] = await Promise.all([
    loadTeacherCirculars(),
    loadCommsGroups(),
    loadCircularCategories(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t.circulares.title}
        description={t.circulares.description}
        backHref="/comunicacion/mensajes"
        backLabel={t.common.back}
      />
      <TeacherCircularsWorkspace
        circulars={circulars}
        groups={groups.map((group) => ({
          id: group.id,
          name: group.name,
          parentCount: group.parentCount,
          studentCount: group.studentCount,
        }))}
        categories={categories}
      />
    </div>
  );
}
