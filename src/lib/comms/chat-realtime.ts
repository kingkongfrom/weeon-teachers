"use client";

import {
  bindRealtimeAuthRefresh,
  detachRealtimeTopic,
  getAuthedRealtimeClient,
  withRealtimeTopicLock,
  type RealtimeConfig,
} from "@/lib/supabase/browser";

export type ChatLivePayload = {
  id: string;
  body: string;
  createdAt: string;
  authorProfileId: string;
};

export type ChatLiveHandle = {
  broadcastMessage: (message: ChatLivePayload) => void;
  notifyTyping: () => void;
};

function rowToPayload(row: Record<string, unknown>): ChatLivePayload | null {
  const id = typeof row.id === "string" ? row.id : "";
  const body = typeof row.body === "string" ? row.body : "";
  if (!id || !body) return null;
  return {
    id,
    body,
    createdAt: typeof row.created_at === "string" ? row.created_at : new Date().toISOString(),
    authorProfileId: typeof row.author_profile_id === "string" ? row.author_profile_id : "",
  };
}

async function connectChatLive(
  roomPrefix: string,
  conversationId: string,
  messageTable: "admin_teacher_chat_messages" | "chat_messages",
  conversationTable: "admin_teacher_chat_conversations" | "chat_conversations",
  realtime: RealtimeConfig,
  handlers: {
    onMessage: (message: ChatLivePayload) => void;
    onTyping?: () => void;
    onDeleted?: () => void;
  },
): Promise<{ handle: ChatLiveHandle; cleanup: () => Promise<void> }> {
  const topic = `${roomPrefix}:${conversationId}`;

  return withRealtimeTopicLock(topic, async () => {
    const supabase = await getAuthedRealtimeClient(realtime);
    const unbindAuth = bindRealtimeAuthRefresh(supabase);
    await detachRealtimeTopic(supabase, topic);

    const channel = supabase
      .channel(topic, { config: { broadcast: { self: false } } })
      .on("broadcast", { event: "message" }, (event: { payload: Partial<ChatLivePayload> }) => {
        const payload = event.payload as Partial<ChatLivePayload>;
        if (!payload?.id || !payload.body) return;
        handlers.onMessage({
          id: payload.id,
          body: payload.body,
          createdAt: payload.createdAt ?? new Date().toISOString(),
          authorProfileId: payload.authorProfileId ?? "",
        });
      })
      .on("broadcast", { event: "typing" }, () => handlers.onTyping?.())
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: messageTable,
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload: { new: Record<string, unknown> }) => {
          const message = rowToPayload(payload.new);
          if (message) handlers.onMessage(message);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: conversationTable,
          filter: `id=eq.${conversationId}`,
        },
        () => handlers.onDeleted?.(),
      )
      .subscribe();

    return {
      handle: {
        broadcastMessage: (message) => {
          void channel.send({ type: "broadcast", event: "message", payload: message });
        },
        notifyTyping: () => {
          void channel.send({ type: "broadcast", event: "typing", payload: { at: Date.now() } });
        },
      },
      cleanup: async () => {
        unbindAuth();
        await detachRealtimeTopic(supabase, topic);
      },
    };
  });
}

export function connectAdminTeacherChatLive(
  conversationId: string,
  realtime: RealtimeConfig,
  handlers: Parameters<typeof connectChatLive>[5],
) {
  return connectChatLive(
    "admin-teacher-chat-room",
    conversationId,
    "admin_teacher_chat_messages",
    "admin_teacher_chat_conversations",
    realtime,
    handlers,
  );
}

export function connectGuardianChatLive(
  conversationId: string,
  realtime: RealtimeConfig,
  handlers: Parameters<typeof connectChatLive>[5],
) {
  return connectChatLive(
    "guardian-chat-room",
    conversationId,
    "chat_messages",
    "chat_conversations",
    realtime,
    handlers,
  );
}
