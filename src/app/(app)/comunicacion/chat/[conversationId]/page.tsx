import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { ChatWorkspace } from "@/components/messages/chat-workspace";
import {
  loadChatConversation,
  loadChatConversations,
  loadChatGuardianContacts,
} from "@/lib/dashboard/chat";
import { getTeacherSession } from "@/lib/auth/teacher-session";
import { loadBrowserRealtimeConfig } from "@/lib/supabase/realtime-session";
import { getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

/** One chat conversation inside the split workspace. */
export default async function ChatThreadPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = await params;
  const t = await getT();
  const session = await getTeacherSession();
  if (!session) notFound();

  const [detail, conversations, contacts] = await Promise.all([
    loadChatConversation(conversationId),
    loadChatConversations(),
    loadChatGuardianContacts(),
  ]);
  if (!detail) notFound();
  const realtime = await loadBrowserRealtimeConfig();

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={t.messages.chatTitle}
        description={t.messages.chatDescription}
        backHref="/comunicacion"
      />
      <ChatWorkspace
        conversations={conversations}
        contacts={contacts}
        realtime={realtime}
        selectedId={conversationId}
        selectedDetail={detail}
        me={session.userId}
      />
    </div>
  );
}
