import type { Metadata } from "next";
import { MessagesComposeClient } from "@/components/dashboard/messages-compose-client";
import { loadCommsGroups } from "@/lib/dashboard/comms-groups";
import { loadMessageDraft } from "@/lib/dashboard/message-drafts";
import { loadMessageContacts } from "@/lib/dashboard/messages";
import { getLocale } from "@/lib/i18n/server";
import { tComms } from "@/lib/i18n/translate-comms";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return { title: tComms(locale, "comms.composeMetaTitle") };
}

/** Compose message — unified composer (To/Cc, attachments, Dropbox). */
export default async function NewMessagePage({
  searchParams,
}: {
  searchParams: Promise<{ draft?: string }>;
}) {
  const { draft } = await searchParams;
  const [contacts, groups, initialDraft] = await Promise.all([
    loadMessageContacts(),
    loadCommsGroups(),
    draft ? loadMessageDraft(draft) : Promise.resolve(null),
  ]);

  return <MessagesComposeClient contacts={contacts} groups={groups} initialDraft={initialDraft} />;
}
