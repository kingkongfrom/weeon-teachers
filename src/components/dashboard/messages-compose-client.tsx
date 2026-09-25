"use client";

import { UnifiedMessageComposer } from "@/components/comms/unified-message-composer";
import type { CommsGroupWithGrade } from "@/lib/comms/broadcast-filter";
import type { MessageDraftRecord } from "@/lib/comms/message-draft";
import type { MessageContact } from "@/lib/dashboard/messages";

export function MessagesComposeClient({
  contacts,
  groups,
  initialDraft = null,
}: {
  contacts: MessageContact[];
  groups: CommsGroupWithGrade[];
  initialDraft?: MessageDraftRecord | null;
}) {
  return <UnifiedMessageComposer contacts={contacts} groups={groups} initialDraft={initialDraft} />;
}
