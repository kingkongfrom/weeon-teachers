"use client";

import { UnifiedMessageComposer } from "@/components/comms/unified-message-composer";
import type { CommsGroupWithGrade } from "@/lib/comms/broadcast-filter";
import type { MessageContact } from "@/lib/dashboard/messages";

export function MessagesComposeClient({
  contacts,
  groups,
}: {
  contacts: MessageContact[];
  groups: CommsGroupWithGrade[];
}) {
  return <UnifiedMessageComposer contacts={contacts} groups={groups} />;
}
