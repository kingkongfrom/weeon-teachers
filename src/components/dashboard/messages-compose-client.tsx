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
    /*
       * BOTTOM CLEARANCE FOR THE FIXED FOOTER.
       *
       * This was `min-h-[calc(100vh-8rem)]` with no allowance for the phone bar,
       * which is `position: fixed` and so paints OVER the page. The recipient
       * rows, editor and send button ran underneath it.
       *
       * `padding-bottom` (not margin) keeps the gap INSIDE the scroll area so the
       * last control can be scrolled clear of the bar rather than sitting under
       * it. `--phone-nav-height` is the same token the comms pane subtracts, so
       * they agree instead of double-counting.
       */
      /*
       * A BOUNDED, SCROLLING PAGE ON A PHONE.
       *
       * `min-h` let the page grow with the composer, so nothing ever scrolled: the
       * inner `overflow-y-auto` had no height to overflow and the fixed footer covered
       * the tail of the message. A fixed viewport height minus the header makes the
       * page itself the scroll container, so every row is reachable.
       *
       * `--phone-nav-height` is this repo's token; weeon-tenants calls it
       * `--phone-bottom-bar`. Referencing the wrong one silently voids the calc().
       */
      <div className="h-[calc(100dvh-4rem-var(--phone-nav-height)-env(safe-area-inset-bottom,0px))] overflow-y-auto bg-surface px-[10px] pb-0 md:h-auto md:min-h-[calc(100vh-8rem)] md:overflow-visible md:pb-0">
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
