import { GruposPageView } from "@/components/grupos/grupos-page-view";
import { getTeacherSession } from "@/lib/auth/teacher-session";
import { loadSchoolName } from "@/lib/dashboard/school";
import { loadTeacherGrupos } from "@/lib/dashboard/grupos";

export const dynamic = "force-dynamic";

export default async function GruposPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const session = await getTeacherSession();

  const [grupos, schoolName] = await Promise.all([
    loadTeacherGrupos(),
    session ? loadSchoolName(session.tenantId) : Promise.resolve(null),
  ]);

  return (
    <GruposPageView
      grupos={grupos}
      schoolName={schoolName}
      year={new Date().getFullYear()}
      tab={tab}
    />
  );
}
