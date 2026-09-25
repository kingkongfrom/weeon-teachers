import { Mail, MessageCircle } from "lucide-react";
import { HubModuleCard } from "@/components/dashboard/hub-module-card";
import { PageHeader } from "@/components/layout/page-header";
import { getT } from "@/lib/i18n/server";
import type { HubTone } from "@/lib/dashboard/tones";
import { TEACHER_MESSAGES } from "@/lib/messages/paths";

export const dynamic = "force-dynamic";

/** Comunicación hub: Mensajes and Chat. */
export default async function CommunicationPage() {
  const t = await getT();
  const m = t.messages;

  const cards: Array<{
    id: string;
    href: string;
    icon: typeof Mail;
    label: string;
    description: string;
    tone: HubTone;
  }> = [
    {
      id: "messages",
      href: TEACHER_MESSAGES,
      icon: Mail,
      label: m.hubMessagesTitle,
      description: m.hubMessagesDescription,
      tone: "blue",
    },
    {
      id: "chat",
      href: "/comunicacion/chat",
      icon: MessageCircle,
      label: m.chatTitle,
      description: m.chatDescription,
      tone: "green",
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title={m.hubTitle} description={m.hubDescription} />
      <div className="grid auto-rows-fr gap-3 sm:grid-cols-2 sm:gap-4">
        {cards.map((card) => (
          <HubModuleCard
            key={card.id}
            tone={card.tone}
            icon={card.icon}
            title={card.label}
            description={card.description}
            href={card.href}
          />
        ))}
      </div>
    </div>
  );
}
