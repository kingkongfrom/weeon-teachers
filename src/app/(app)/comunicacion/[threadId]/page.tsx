import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { ThreadView } from "@/components/messages/thread-view";
import { loadThreadDetail } from "@/lib/dashboard/messages";
import { getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

/** One message thread. */
export default async function MessageThreadPage({
  params,
}: {
  params: Promise<{ threadId: string }>;
}) {
  const { threadId } = await params;
  const t = await getT();
  const detail = await loadThreadDetail(threadId);
  if (!detail) notFound();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t.messages.title}
        description={detail.summary.subject}
        backHref="/comunicacion"
      />
      <ThreadView detail={detail} />
    </div>
  );
}
