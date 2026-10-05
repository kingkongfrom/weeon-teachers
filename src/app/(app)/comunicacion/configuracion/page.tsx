import type { Metadata } from "next";
import { BackLink } from "@/components/layout/page-header";
import { MessageSignatureCard } from "@/components/comms/message-signature-card";
import { loadMessageMailboxSettings } from "@/lib/dashboard/message-mailbox-settings";
import { getLocale } from "@/lib/i18n/server";
import { tComms } from "@/lib/i18n/translate-comms";
import { COMMS_MESSAGES } from "@/lib/comms/paths";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return { title: tComms(locale, "settings.messageSignature.pageTitle") };
}

export default async function ComunicacionConfiguracionPage() {
  const locale = await getLocale();
  const mailboxSettings = await loadMessageMailboxSettings();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6">
      <BackLink href={COMMS_MESSAGES} label={tComms(locale, "comms.back")} />
      <header>
        <h1 className="text-2xl font-bold text-foreground">
          {tComms(locale, "comms.settingsSection")}
        </h1>
        <p className="mt-1 text-sm font-medium text-foreground/55">
          {tComms(locale, "settings.messageSignature.pageDescription")}
        </p>
      </header>
      {mailboxSettings ? <MessageSignatureCard initialSettings={mailboxSettings} /> : null}
    </div>
  );
}
