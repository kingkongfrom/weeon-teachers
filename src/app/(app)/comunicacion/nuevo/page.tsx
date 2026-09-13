import { PageHeader } from "@/components/layout/page-header";
import { MessageComposer } from "@/components/messages/message-composer";
import { loadMessageContacts } from "@/lib/dashboard/messages";
import { loadTeacherGrupos } from "@/lib/dashboard/grupos";
import { getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

/** Compose a new message. */
export default async function NewMessagePage() {
  const t = await getT();
  const [contacts, grupos] = await Promise.all([loadMessageContacts(), loadTeacherGrupos()]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t.messages.compose}
        description={t.messages.description}
        backHref="/comunicacion"
      />
      <MessageComposer
        contacts={contacts}
        groups={grupos.map((grupo) => ({ id: grupo.id, name: grupo.name }))}
      />
    </div>
  );
}
