import type { Metadata } from "next";
import { MessagesComposeClient } from "@/components/dashboard/messages-compose-client";
import { loadCommsGroups } from "@/lib/dashboard/comms-groups";
import { loadMessageDraft } from "@/lib/dashboard/message-drafts";
import { loadThreadComposeSeed } from "@/lib/dashboard/thread-compose-load";
import { loadMessageContacts } from "@/lib/dashboard/messages";
import { getCommsActor } from "@/lib/dashboard/comms-session";
import { loadBrowserRealtimeConfig } from "@/lib/supabase/realtime-session";
import { resolveAuthorEmailIdentity } from "@/lib/email/resolve-tenant-email-identity";
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
  /*
   * `realtime` IS REQUIRED FOR THE RECIPIENT CHIP'S PRESENCE DOT.
   *
   * The chip, the Para field and useProfilePresence were all wired correctly, but
   * this page never supplied the realtime config, so the hook had no client to
   * subscribe with and every status came back empty — a grey dot for everyone,
   * while the same chip in weeon-tenants turned green. The mailbox page already
   * loads it this way.
   */
  const [contacts, groups, initialDraft, threadSeed, senderIdentity, realtime] = await Promise.all([
    loadMessageContacts(),
    loadCommsGroups(),
    draft ? loadMessageDraft(draft) : Promise.resolve(null),
    threadId && !draft ? loadThreadComposeSeed(threadId) : Promise.resolve(null),
    session
      ? resolveAuthorEmailIdentity({
          tenantId: session.tenantId,
          authorProfileId: session.userId,
        })
      : Promise.resolve(null),
    loadBrowserRealtimeConfig(),
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
      realtime={realtime}
    />
  );
}
