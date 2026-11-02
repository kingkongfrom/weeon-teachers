"use client";

import { UnifiedMessageComposer } from "@/components/comms/unified-message-composer";
import type { CommsGroupWithGrade } from "@/lib/comms/broadcast-filter";
import type { MessageDraftRecord } from "@/lib/comms/message-draft";
import type { MessageContact } from "@/lib/dashboard/messages";
import type { RealtimeConfig } from "@/lib/supabase/browser";

export function MessagesComposeClient({
  contacts,
  groups,
  initialDraft = null,
  persistDraft = true,
  realtime = null,
  fromLabel = "",
}: {
  contacts: MessageContact[];
  groups: CommsGroupWithGrade[];
  initialDraft?: MessageDraftRecord | null;
  persistDraft?: boolean;
  realtime?: RealtimeConfig | null;
  fromLabel?: string;
}) {
  return (
    <div className="min-h-[calc(100vh-8rem)] bg-surface px-[10px]">
      <div className="mx-auto w-full max-w-6xl">
        <UnifiedMessageComposer
          contacts={contacts}
          groups={groups}
          initialDraft={initialDraft}
          persistDraft={persistDraft}
          realtime={realtime}
          fromLabel={fromLabel}
        />
      </div>
    </div>
  );
}
