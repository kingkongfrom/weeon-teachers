import { AulaVirtualPageView } from "@/components/classroom/aula-virtual-page-view";
import { getTeacherSession } from "@/lib/auth/teacher-session";
import { loadSchoolName } from "@/lib/dashboard/school";
import { loadTeacherGrupos } from "@/lib/dashboard/grupos";
import { loadGradingInbox } from "@/lib/dashboard/grading-inbox";
import { loadJustificationInbox } from "@/lib/dashboard/justification-inbox";

export const dynamic = "force-dynamic";

/**
 * Virtual classroom section — the classes grid, which navigates into each
 * class. Reached from the `/inicio` landing card.
 */
export default async function AulaVirtualPage() {
  const session = await getTeacherSession();

  const [grupos, schoolName, inbox, justifications] = await Promise.all([
    loadTeacherGrupos(),
    session ? loadSchoolName(session.tenantId) : Promise.resolve(null),
    loadGradingInbox(),
    loadJustificationInbox(),
  ]);

  return (
    <AulaVirtualPageView
      grupos={grupos}
      schoolName={schoolName}
      year={new Date().getFullYear()}
      inboxCount={inbox.length}
      justificationCount={justifications.length}
    />
  );
}
