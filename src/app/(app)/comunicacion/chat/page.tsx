import { PageHeader } from "@/components/layout/page-header";
import { ChatList } from "@/components/messages/chat-list";
import { loadChatConversations, loadChatGuardianContacts } from "@/lib/dashboard/chat";
import { requireSupabasePublicEnv } from "@/lib/supabase/env";
import { getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

/** Chat — realtime 1:1 conversations with guardians. */
export default async function ChatListPage() {
  const t = await getT();
  const [conversations, contacts] = await Promise.all([
    loadChatConversations(),
    loadChatGuardianContacts(),
  ]);
  const { url, anonKey } = requireSupabasePublicEnv();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t.messages.chatTitle}
        description={t.messages.chatDescription}
        backHref="/comunicacion"
      />
      <ChatList conversations={conversations} contacts={contacts} realtime={{ url, anonKey }} />
    </div>
  );
}
