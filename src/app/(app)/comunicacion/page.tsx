import { Mail, MessageCircle } from "lucide-react";
import { HubModuleCard } from "@/components/dashboard/hub-module-card";
import { PageHeader } from "@/components/layout/page-header";
import { loadPanelAttention } from "@/lib/dashboard/panel-attention";
import { getT } from "@/lib/i18n/server";
import type { HubTone } from "@/lib/dashboard/tones";
import { COMMS_CHAT, COMMS_MESSAGES } from "@/lib/comms/paths";

export const dynamic = "force-dynamic";

/** Comunicación hub: Mensajes and Chat. */
export default async function CommunicationPage() {
  const [t, attention] = await Promise.all([getT(), loadPanelAttention()]);
  const m = t.messages;

  const cards: Array<{
    id: string;
    href: string;
    icon: typeof Mail;
    label: string;
    description: string;
    tone: HubTone;
    badgeCount: number;
  }> = [
    {
      id: "messages",
      href: `${COMMS_MESSAGES}?folder=inbox`,
      icon: Mail,
      label: m.hubMessagesTitle,
      description: m.hubMessagesDescription,
      tone: "blue",
      badgeCount: attention.unreadInboxCount,
    },
    {
      id: "chat",
      href: COMMS_CHAT,
      icon: MessageCircle,
      label: m.chatTitle,
      description: m.chatDescription,
      tone: "green",
      badgeCount: attention.unreadChatCount,
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title={m.hubTitle} description={m.hubDescription} />
      <div className="grid max-w-md grid-cols-2 gap-3 sm:max-w-xl sm:gap-4">
        {cards.map((card) => (
          <HubModuleCard
            key={card.id}
            layout="square"
            tone={card.tone}
            icon={card.icon}
            title={card.label}
            description={card.description}
            href={card.href}
            badgeCount={card.badgeCount}
          />
        ))}
      </div>
    </div>
  );
}
