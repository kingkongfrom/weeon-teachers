import { PageHeader } from "@/components/layout/page-header";
import { ChatWorkspace } from "@/components/messages/chat-workspace";
import { loadChatConversations, loadChatGuardianContacts } from "@/lib/dashboard/chat";
import { getTeacherSession } from "@/lib/auth/teacher-session";
import { loadBrowserRealtimeConfig } from "@/lib/supabase/realtime-session";
import { getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

/** Chat — split workspace: conversation list + thread pane. */
export default async function ChatListPage() {
  const t = await getT();
  const session = await getTeacherSession();
  const [conversations, contacts] = await Promise.all([
    loadChatConversations(),
    loadChatGuardianContacts(),
  ]);
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
        selectedId={null}
        selectedDetail={null}
        me={session?.userId ?? ""}
      />
    </div>
  );
}
