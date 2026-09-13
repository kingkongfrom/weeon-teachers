import { PageHeader } from "@/components/layout/page-header";
import { MailboxWorkspace } from "@/components/messages/mailbox-workspace";
import {
  loadMessageLabels,
  loadMessageSummaries,
  type MessageFolder,
} from "@/lib/dashboard/messages";
import { getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

function parseFolder(value: string | undefined): MessageFolder {
  if (value === "sent" || value === "trash") return value;
  return "inbox";
}

/** Comunicación — the teacher mailbox: folders, categories, drag & drop. */
export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ folder?: string; label?: string }>;
}) {
  const { folder: folderParam, label: labelParam } = await searchParams;
  const folder = parseFolder(folderParam);
  const labelId = labelParam && /^[0-9a-f-]{36}$/i.test(labelParam) ? labelParam : null;
  const t = await getT();

  const [threads, labels] = await Promise.all([
    loadMessageSummaries(folder, labelId),
    loadMessageLabels(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t.messages.title} description={t.messages.description} backHref="/inicio" />
      <MailboxWorkspace folder={folder} labelId={labelId} labels={labels} threads={threads} />
    </div>
  );
}
