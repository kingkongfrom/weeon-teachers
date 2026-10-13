import { ChatWorkspace } from "@/components/messages/chat-workspace";
import { loadChatConversations, loadChatGuardianContacts } from "@/lib/dashboard/chat";
import { getTeacherSession } from "@/lib/auth/teacher-session";
import { loadBrowserRealtimeConfig } from "@/lib/supabase/realtime-session";

export const dynamic = "force-dynamic";

/** Chat — split workspace: conversation list + thread pane. */
export default async function ChatListPage() {
  const session = await getTeacherSession();
  const [conversations, contacts] = await Promise.all([
    loadChatConversations(),
    loadChatGuardianContacts(),
  ]);
  const realtime = await loadBrowserRealtimeConfig();

  return (
    <ChatWorkspace
      conversations={conversations}
      contacts={contacts}
      realtime={realtime}
      selectedId={null}
      selectedDetail={null}
      me={session?.userId ?? ""}
    />
  );
}
