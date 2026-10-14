import type { Metadata } from "next";
import { MessagesComposeClient } from "@/components/dashboard/messages-compose-client";
import { loadCommsGroups } from "@/lib/dashboard/comms-groups";
import { loadMessageDraft } from "@/lib/dashboard/message-drafts";
import { loadThreadComposeSeed } from "@/lib/dashboard/thread-compose-load";
import { loadMessageContacts } from "@/lib/dashboard/messages";
import { getCommsActor } from "@/lib/dashboard/comms-session";
import { resolveTenantEmailIdentity } from "@/lib/email/resolve-tenant-email-identity";
import { formatComposeFromDisplay } from "@/lib/email/tenant-from";
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
  searchParams: Promise<{ draft?: string; thread?: string }>;
}) {
  const { draft, thread } = await searchParams;
  const threadId = thread && /^[0-9a-f-]{36}$/i.test(thread) ? thread : null;
  const session = await getCommsActor();
  const [contacts, groups, initialDraft, threadSeed, senderIdentity] = await Promise.all([
    loadMessageContacts(),
    loadCommsGroups(),
    draft ? loadMessageDraft(draft) : Promise.resolve(null),
    threadId && !draft ? loadThreadComposeSeed(threadId) : Promise.resolve(null),
    session ? resolveTenantEmailIdentity(session.tenantId) : Promise.resolve(null),
  ]);
  const fromLabel = senderIdentity ? formatComposeFromDisplay(senderIdentity) : "";

  const seed = initialDraft ?? threadSeed;
  return (
    <MessagesComposeClient
      contacts={contacts}
      groups={groups}
      initialDraft={seed}
      persistDraft
      fromLabel={fromLabel}
    />
  );
}
