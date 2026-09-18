import { PageHeader } from "@/components/layout/page-header";
import { MessageComposer } from "@/components/messages/message-composer";
import { loadMessageContacts } from "@/lib/dashboard/messages";
import { loadTeacherGrupos } from "@/lib/dashboard/grupos";
import { getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

/** Compose a new circular (one-way announcement). */
export default async function NewCircularPage() {
  const t = await getT();
  const [contacts, grupos] = await Promise.all([loadMessageContacts(), loadTeacherGrupos()]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t.messages.compose}
        description={t.messages.composeDescription}
        backHref="/comunicacion/circulares"
      />
      <MessageComposer
        contacts={contacts}
        groups={grupos.map((grupo) => ({
          id: grupo.id,
          name: grupo.name,
          studentCount: grupo.studentCount,
          parentCount: grupo.parentCount,
        }))}
      />
    </div>
  );
}
