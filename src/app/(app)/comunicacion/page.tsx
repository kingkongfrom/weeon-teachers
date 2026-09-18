import { MessageCircle, ScrollText } from "lucide-react";
import { HubModuleCard } from "@/components/dashboard/hub-module-card";
import { PageHeader } from "@/components/layout/page-header";
import { getT } from "@/lib/i18n/server";
import type { HubTone } from "@/lib/dashboard/tones";

export const dynamic = "force-dynamic";

/** Comunicación hub: Circulares (one-way) and Chat (two-way). */
export default async function CommunicationPage() {
  const t = await getT();
  const m = t.messages;

  const cards: Array<{
    id: string;
    href: string;
    icon: typeof ScrollText;
    label: string;
    description: string;
    tone: HubTone;
  }> = [
    {
      id: "circulares",
      href: "/comunicacion/circulares",
      icon: ScrollText,
      label: m.circularesTitle,
      description: m.circularesDescription,
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
      <PageHeader title={m.hubTitle} description={m.hubDescription} backHref="/inicio" />
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
