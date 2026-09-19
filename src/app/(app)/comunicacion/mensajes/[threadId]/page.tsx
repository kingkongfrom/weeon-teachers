import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ThreadView } from "@/components/comms/thread-view";
import { COMMS_MESSAGES, isCommsMessageComposeSlug } from "@/lib/comms/paths";
import { loadThreadDetail } from "@/lib/dashboard/messages";
import { getLocale } from "@/lib/i18n/server";
import { tComms } from "@/lib/i18n/translate-comms";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ threadId: string }>;
}): Promise<Metadata> {
  const { threadId } = await params;
  const locale = await getLocale();
  const detail = await loadThreadDetail(threadId);
  const subject = detail?.summary.subject ?? tComms(locale, "comms.messagesTitle");
  return { title: `${subject} · Weeon Teachers` };
}

/** Message thread with optional replies. */
export default async function MessageDetailPage({
  params,
}: {
  params: Promise<{ threadId: string }>;
}) {
  const { threadId } = await params;

  if (isCommsMessageComposeSlug(threadId)) {
    notFound();
  }

  const detail = await loadThreadDetail(threadId);
  if (!detail) notFound();

  return (
    <div className="flex flex-col gap-6">
      <ThreadView detail={detail} mailboxBase={COMMS_MESSAGES} />
    </div>
  );
}
