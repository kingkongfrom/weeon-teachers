import { Mail, MessageCircle } from "lucide-react";
import {
  ComunicacionHubActivity,
} from "@/components/comms/comunicacion-hub-activity";
import {
  ComunicacionHubChannels,
  type ComunicacionHubChannel,
} from "@/components/comms/comunicacion-hub-channels";
import { PanelAttentionStrip } from "@/components/dashboard/panel-attention";
import { FadeIn } from "@/components/motion/fade-in";
import { PageHeader } from "@/components/layout/page-header";
import { loadChatConversations } from "@/lib/dashboard/chat";
import { loadMessageSummaries } from "@/lib/dashboard/messages";
import { loadPanelAttention } from "@/lib/dashboard/panel-attention";
import { getT } from "@/lib/i18n/server";
import { COMMS_CHAT, COMMS_MESSAGES } from "@/lib/comms/paths";

export const dynamic = "force-dynamic";

/** Comunicación hub — channel rails + dual inbox/chat preview (full width). */
export default async function CommunicationPage() {
  const [t, attention, inbox, chats] = await Promise.all([
    getT(),
    loadPanelAttention(),
    loadMessageSummaries("inbox"),
    loadChatConversations(),
  ]);
  const m = t.messages;

  const channels: ComunicacionHubChannel[] = [
    {
      id: "messages",
      href: `${COMMS_MESSAGES}?folder=inbox`,
      icon: Mail,
      title: m.hubMessagesTitle,
      hint: m.hubMessagesRailHint,
      tone: "blue",
      badgeCount: attention.unreadInboxCount,
      statLabel:
        attention.unreadInboxCount > 0
          ? t.panel.unreadCount(attention.unreadInboxCount)
          : inbox.length > 0
            ? m.hubInboxCount(inbox.length)
            : undefined,
    },
    {
      id: "chat",
      href: COMMS_CHAT,
      icon: MessageCircle,
      title: m.chatTitle,
      hint: m.hubChatRailHint,
      tone: "green",
      badgeCount: attention.unreadChatCount,
      statLabel:
        attention.unreadChatCount > 0
          ? t.panel.unreadCount(attention.unreadChatCount)
          : chats.length > 0
            ? m.hubChatCount(chats.length)
            : undefined,
    },
  ];

  return (
    <FadeIn className="flex flex-col gap-6">
      <PageHeader title={m.hubTitle} description={m.hubDescription} />

      <PanelAttentionStrip attention={attention} />

      <FadeIn delay={0.05}>
        <ComunicacionHubChannels channels={channels} />
      </FadeIn>

      <FadeIn delay={0.1}>
        <ComunicacionHubActivity inbox={inbox} chats={chats} />
      </FadeIn>
    </FadeIn>
  );
}
