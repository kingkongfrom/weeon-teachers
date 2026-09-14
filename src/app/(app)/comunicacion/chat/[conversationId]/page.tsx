import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { ChatThread } from "@/components/messages/chat-thread";
import { loadChatConversation } from "@/lib/dashboard/chat";
import { getTeacherSession } from "@/lib/auth/teacher-session";
import { requireSupabasePublicEnv } from "@/lib/supabase/env";
import { getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

/** One chat conversation. */
export default async function ChatThreadPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = await params;
  const t = await getT();
  const [detail, session] = await Promise.all([
    loadChatConversation(conversationId),
    getTeacherSession(),
  ]);
  if (!detail || !session) notFound();
  const { url, anonKey } = requireSupabasePublicEnv();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t.messages.chatTitle}
        description={detail.counterpartName}
        backHref="/comunicacion/chat"
      />
      <ChatThread
        conversationId={detail.id}
        me={session.userId}
        counterpartName={detail.counterpartName}
        initialMessages={detail.messages}
        realtime={{ url, anonKey }}
      />
    </div>
  );
}
