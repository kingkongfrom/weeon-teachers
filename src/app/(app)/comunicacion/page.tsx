import Link from "next/link";
import { Mail, MessageCircle } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { cn } from "@/lib/utils";
import {
  CHIP_ICON,
  TONE_CARD,
  TONE_INK,
  TONE_INK_MUTED,
  type Tone,
} from "@/lib/dashboard/tones";
import { getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

/** Comunicación hub: two ways to reach guardians — Correo and Chat. */
export default async function CommunicationPage() {
  const t = await getT();
  const m = t.messages;

  const cards: Array<{
    id: string;
    href: string;
    icon: typeof Mail;
    label: string;
    description: string;
    tone: Tone;
  }> = [
    {
      id: "email",
      href: "/comunicacion/correo",
      icon: Mail,
      label: m.emailTitle,
      description: m.emailDescription,
      tone: "blue",
    },
    {
      id: "chat",
      href: "/comunicacion/chat",
      icon: MessageCircle,
      label: m.chatTitle,
      description: m.chatDescription,
      tone: "purple",
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={m.hubTitle} description={m.hubDescription} backHref="/inicio" />
      <div className="grid auto-rows-fr gap-4 sm:grid-cols-2">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link key={card.id} href={card.href} className="group block h-full">
              <div
                className={cn(
                  "flex h-full flex-col rounded-2xl p-5 ring-1 ring-inset ring-black/5 transition-all group-hover:brightness-[0.96] group-hover:ring-black/15 dark:ring-white/10 dark:group-hover:brightness-110 dark:group-hover:ring-white/20",
                  TONE_CARD[card.tone],
                  TONE_INK,
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/45 dark:bg-white/10">
                    <Icon className={cn("h-6 w-6", CHIP_ICON)} strokeWidth={2.2} />
                  </div>
                  <h2 className="min-w-0 text-xl font-bold leading-tight">{card.label}</h2>
                </div>
                <p className={cn("mt-3 text-sm font-medium", TONE_INK_MUTED)}>
                  {card.description}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
