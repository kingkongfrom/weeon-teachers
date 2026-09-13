import { PageHeader } from "@/components/layout/page-header";
import { MailboxWorkspace } from "@/components/messages/mailbox-workspace";
import { loadMessageSummaries, type MessageFolder } from "@/lib/dashboard/messages";
import { getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

function parseFolder(value: string | undefined): MessageFolder {
  if (value === "sent" || value === "trash") return value;
  return "inbox";
}

/** Comunicación — the teacher mailbox: folders (Recibidos / Enviados / Papelera). */
export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ folder?: string }>;
}) {
  const { folder: folderParam } = await searchParams;
  const folder = parseFolder(folderParam);
  const t = await getT();

  const threads = await loadMessageSummaries(folder);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t.messages.title} description={t.messages.description} backHref="/inicio" />
      <MailboxWorkspace folder={folder} threads={threads} />
    </div>
  );
}
