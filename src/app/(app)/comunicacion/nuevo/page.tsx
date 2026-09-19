import type { Metadata } from "next";
import { MessagesComposeClient } from "@/components/dashboard/messages-compose-client";
import { loadCommsGroups } from "@/lib/dashboard/comms-groups";
import { loadMessageContacts } from "@/lib/dashboard/messages";
import { getLocale } from "@/lib/i18n/server";
import { tComms } from "@/lib/i18n/translate-comms";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return { title: tComms(locale, "comms.composeMetaTitle") };
}

/** Compose message — unified composer (To/Cc, attachments, Dropbox). */
export default async function NewMessagePage() {
  const [contacts, groups] = await Promise.all([loadMessageContacts(), loadCommsGroups()]);

  return <MessagesComposeClient contacts={contacts} groups={groups} />;
}
