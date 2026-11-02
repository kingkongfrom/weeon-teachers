import type { Metadata } from "next";
import { CircularesWorkspace } from "@/components/comms/circulares-workspace";
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
  const [circulars, trash, groups, categories] = await Promise.all([
    loadTeacherCirculars(false),
    loadTeacherCirculars(true),
    loadCommsGroups(),
    loadCircularCategories(),
  ]);

  return (
    <div className="-mx-4 -mt-6 h-[calc(100dvh-4rem)] min-h-[28rem] sm:-mx-5 md:mx-0 md:mt-0 md:h-[calc(100dvh-9rem)]">
      <CircularesWorkspace
        circulars={circulars}
        trash={trash}
        categories={categories}
        groups={groups}
      />
    </div>
  );
}
