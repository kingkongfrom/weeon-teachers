import "server-only";

import { cache } from "react";
import { docToPlainText, type RichTextDoc } from "@/lib/comms/model";
import {
  circularAudienceToKind,
  type CircularAudienceSlug,
} from "@/lib/comms/circular-audience";
import { counterpartLabels } from "@/lib/comms/counterpart-labels";
import { collectEmbedPaths, injectEmbedUrls } from "@/lib/comms/rich-text-embeds";
import { getCommsActor } from "@/lib/dashboard/comms-session";
import { formatSentCounterpart } from "@/lib/dashboard/message-counterpart";
import { getRequestLocale } from "@/lib/i18n/server";

export type MessageFolder = "inbox" | "sent" | "trash" | "favorite";

export type MessageLabel = {
  id: string;
  name: string;
  color: string;
  position: number;
  threadCount: number;
};

export type MessageRecipientScope = "parents" | "students" | "teachers" | "custom" | null;

export type CommsMailboxChannel = "circulares" | "correo";

export type MessageListTag = {
  id: string;
  label: string;
  tone: "amber" | "green" | "teal" | "purple" | "slate";
};

export type MessageThreadSummary = {
  id: string;
  subject: string;
  audience: "individual" | "group";
  className: string | null;
  counterpart: string;
  authorName: string | null;
  preview: string;
  lastMessageAt: string;
  unread: boolean;
  recipientCount: number;
  recipientScope: MessageRecipientScope;
  attachmentCount: number;
  mine: boolean;
  folder: StoredMessageFolder;
  allowReplies: boolean;
  ccCount: number;
  listTags: MessageListTag[];
  isFavorite: boolean;
};

export type MessageItem = {
  id: string;
  authorName: string;
  body: RichTextDoc;
  createdAt: string;
  mine: boolean;
};

export type MessageRecipient = {
  profileId: string;
  name: string;
  role: "to" | "cc";
  readAt: string | null;
};

export type MessageAttachment = {
  id: string;
  name: string;
  url: string;
  mimeType: string | null;
  sizeBytes: number | null;
};

export type MessageThreadDetail = {
  summary: MessageThreadSummary;
  allowReplies: boolean;
  classId: string | null;
  messages: MessageItem[];
  recipients: MessageRecipient[];
  attachments: MessageAttachment[];
};

export type MessageContact = {
  key: string;
  name: string;
  kind: string;
  context: string;
  classId: string | null;
};

type NameEmbed = { name: string } | { name: string }[] | null;

function nameOf(embed: NameEmbed): string {
  const row = Array.isArray(embed) ? embed[0] : embed;
  return row?.name?.trim() ?? "";
}

function parseRecipientScope(value: string | null): MessageRecipientScope {
  if (value === "parents" || value === "students" || value === "teachers" || value === "custom") {
    return value;
  }
  return null;
}

function matchesChannel(allowReplies: boolean, channel: CommsMailboxChannel | null): boolean {
  if (!channel) return true;
  return channel === "correo" ? allowReplies : !allowReplies;
}

type StoredMessageFolder = "inbox" | "sent" | "trash";

function resolveThreadFolder(
  stored: StoredMessageFolder | undefined,
  mine: boolean,
  lastAuthorId: string | null | undefined,
  viewerId: string,
): StoredMessageFolder {
  const base = stored ?? (mine ? "sent" : "inbox");
  if (base === "trash") return "trash";
  if (mine && lastAuthorId && lastAuthorId !== viewerId) return "inbox";
  return base;
}

function classLabel(
  embed:
    | { name?: string; grade?: string; section?: string }
    | { name?: string; grade?: string; section?: string }[]
    | null,
): string | null {
  const row = Array.isArray(embed) ? embed[0] : embed;
  if (!row) return null;
  return row.name?.trim() || [row.grade, row.section].filter(Boolean).join("").toUpperCase() || null;
}

type ThreadRow = {
  id: string;
  subject: string | null;
  audience: string;
  class_id: string | null;
  created_by: string | null;
  allow_replies: boolean;
  recipient_scope: string | null;
  broadcast_filter: { kind?: string; reach?: string } | null;
  last_message_at: string;
  created_at: string;
  profiles: NameEmbed;
  classes:
    | { name?: string; grade?: string; section?: string }
    | { name?: string; grade?: string; section?: string }[]
    | null;
};

type RecipientRow = {
  thread_id: string;
  profile_id: string | null;
  recipient_key: string | null;
  role: "to" | "cc";
  read_at: string | null;
  display_name: string | null;
  profiles: NameEmbed;
};

type MessageRow = {
  thread_id: string;
  body: RichTextDoc;
  created_at: string;
  author_profile_id: string | null;
  profiles: NameEmbed;
};

const THREAD_COLUMNS =
  "id, subject, audience, class_id, created_by, allow_replies, recipient_scope, broadcast_filter, last_message_at, created_at, profiles(name), classes(name, grade, section)";

/** Signed URLs for attachment open/download (mobile + admin detail). */
const ATTACHMENT_SIGNED_URL_TTL_SEC = 60 * 60 * 24;

function scopeKindLabel(scope: MessageRecipientScope): string | null {
  if (scope === "parents") return "Encargados";
  if (scope === "students") return "Estudiantes";
  if (scope === "teachers") return "Docentes";
  return null;
}

function buildListMeta(
  row: ThreadRow,
  threadRecipients: RecipientRow[],
  mine: boolean,
  last: MessageRow | undefined,
): Pick<MessageThreadSummary, "listTags" | "ccCount" | "authorName"> {
  const ccCount = threadRecipients.filter((item) => item.role === "cc").length;
  const authorName = mine
    ? null
    : (last ? nameOf(last.profiles) : "") || nameOf(row.profiles) || "Colegio";
  const tags: MessageListTag[] = [];

  if (ccCount > 0) {
    tags.push({ id: "cc", label: "Copia", tone: "amber" });
  }

  const recipientScope = parseRecipientScope(row.recipient_scope);
  const scopeLabel = scopeKindLabel(recipientScope);
  if (scopeLabel) {
    tags.push({
      id: `scope:${recipientScope}`,
      label: scopeLabel,
      tone:
        recipientScope === "parents"
          ? "amber"
          : recipientScope === "students"
            ? "green"
            : "purple",
    });
  }

  const className = classLabel(row.classes);
  if (className) {
    tags.push({ id: "class", label: className, tone: "teal" });
  }

  if (!row.allow_replies && !mine) {
    tags.push({ id: "circular", label: "Circular", tone: "slate" });
  }

  return { listTags: tags, ccCount, authorName };
}

function threadMatchesCircularAudience(
  row: ThreadRow,
  audience: CircularAudienceSlug,
): boolean {
  const kind = circularAudienceToKind(audience);
  if (row.recipient_scope === kind) return true;
  const filterKind = row.broadcast_filter?.kind;
  if (filterKind === kind) return true;
  return false;
}

export const loadMessageContacts = cache(async (): Promise<MessageContact[]> => {
  const session = await getCommsActor();
  if (!session) return [];

  const { data, error } = await session.actor.rpc("list_message_contacts");
  if (error || !data) return [];

  return (
    data as Array<{
      recipient_key: string;
      full_name: string;
      kind: string;
      context: string;
      class_id: string | null;
    }>
  ).map((row) => ({
    key: row.recipient_key,
    name: row.full_name || "Contacto",
    kind: row.kind,
    context: row.context ?? "",
    classId: row.class_id ?? null,
  }));
});

export const loadCommsUnreadCount = cache(async (): Promise<number> => {
  const inbox = await loadMessageSummaries("inbox", null, null);
  return inbox.filter((row) => row.unread).length;
});

export const loadCommsFavoriteCount = cache(async (): Promise<number> => {
  const favorites = await loadMessageSummaries("favorite", null, null);
  return favorites.length;
});

export const loadMessageLabels = cache(async (): Promise<MessageLabel[]> => {
  const session = await getCommsActor();
  if (!session) return [];

  const [{ data: labels, error }, { data: states }] = await Promise.all([
    session.actor
      .from("message_labels")
      .select("id, name, color, position")
      .order("position")
      .order("name"),
    session.actor
      .from("message_thread_state")
      .select("label_id, folder")
      .eq("owner_profile_id", session.userId)
      .not("label_id", "is", null),
  ]);

  if (error || !labels) return [];

  const counts = new Map<string, number>();
  for (const row of states ?? []) {
    const labelId = row.label_id as string | null;
    if (!labelId || row.folder === "trash") continue;
    counts.set(labelId, (counts.get(labelId) ?? 0) + 1);
  }

  return (labels as Array<{ id: string; name: string; color: string; position: number }>).map(
    (row) => ({
      id: row.id,
      name: row.name,
      color: row.color,
      position: row.position,
      threadCount: counts.get(row.id) ?? 0,
    }),
  );
});

export const loadMessageSummaries = cache(
  async (
    folder: MessageFolder,
    channel: CommsMailboxChannel | null = null,
    labelId: string | null = null,
  ): Promise<MessageThreadSummary[]> => {
    const session = await getCommsActor();
    if (!session) return [];
    const locale = await getRequestLocale();
    const labels = counterpartLabels(locale);

    const { data: threads, error } = await session.actor
      .from("threads")
      .select(THREAD_COLUMNS)
      .order("last_message_at", { ascending: false })
      .limit(200);
    if (error || !threads) return [];

    const rows = threads as ThreadRow[];
    const ids = rows.map((row) => row.id);
    if (ids.length === 0) return [];

    const [{ data: recipients }, { data: messages }, { data: attachments }, { data: states }] =
      await Promise.all([
        session.actor
          .from("thread_recipients")
          .select("thread_id, profile_id, recipient_key, role, read_at, display_name, profiles(name)")
          .in("thread_id", ids),
        session.actor
          .from("messages")
          .select("thread_id, body, created_at, author_profile_id, profiles(name)")
          .in("thread_id", ids)
          .order("created_at", { ascending: true }),
        session.actor.from("message_attachments").select("thread_id").in("thread_id", ids),
        session.actor
          .from("message_thread_state")
          .select("thread_id, folder, label_id, is_favorite")
          .eq("owner_profile_id", session.userId)
          .in("thread_id", ids),
      ]);

    const recipientRows = (recipients ?? []) as RecipientRow[];
    const messageRows = (messages ?? []) as MessageRow[];
    const stateRows = (states ?? []) as Array<{
      thread_id: string;
      folder: StoredMessageFolder;
      label_id: string | null;
      is_favorite: boolean;
    }>;
    const stateByThread = new Map(stateRows.map((row) => [row.thread_id, row]));

    const attachmentCount = new Map<string, number>();
    for (const row of (attachments ?? []) as Array<{ thread_id: string }>) {
      attachmentCount.set(row.thread_id, (attachmentCount.get(row.thread_id) ?? 0) + 1);
    }

    const seen = new Set<string>();
    return rows
      .map((row) => {
        if (seen.has(row.id)) return null;
        seen.add(row.id);

        const threadRecipients = recipientRows.filter((item) => item.thread_id === row.id);
        const threadMessages = messageRows.filter((item) => item.thread_id === row.id);
        const mine = row.created_by === session.userId;
        const state = stateByThread.get(row.id);
        const last = threadMessages[threadMessages.length - 1];
        const resolvedFolder = resolveThreadFolder(
          state?.folder,
          mine,
          last?.author_profile_id,
          session.userId,
        );

        const threadLabelId = state?.label_id ?? null;

        const isFavorite = state?.is_favorite ?? false;

        if (labelId) {
          if (threadLabelId !== labelId || resolvedFolder === "trash") return null;
        } else if (folder === "favorite") {
          if (!isFavorite || resolvedFolder === "trash") return null;
        } else if (folder === "inbox" || folder === "sent" || folder === "trash") {
          if (resolvedFolder !== folder) return null;
          if (threadLabelId) return null;
        } else {
          return null;
        }
        if (!matchesChannel(row.allow_replies, channel)) return null;

        const myRecipient = threadRecipients.find(
          (item) => item.profile_id === session.userId || item.recipient_key === session.userId,
        );

        const audience = row.audience === "group" ? "group" : "individual";
        const className = classLabel(row.classes);
        const recipientNames = threadRecipients.map(
          (item) => nameOf(item.profiles) || item.display_name || "",
        );
        const recipientScope = parseRecipientScope(row.recipient_scope);
        const listMeta = buildListMeta(row, threadRecipients, mine, last);

        return {
          id: row.id,
          subject: row.subject?.trim() || "(Sin asunto)",
          audience,
          className,
          counterpart: mine
            ? formatSentCounterpart(
                recipientNames,
                audience,
                className,
                threadRecipients.length,
                labels,
                recipientScope,
              )
            : nameOf(row.profiles) || "Colegio",
          authorName: listMeta.authorName,
          preview: last ? docToPlainText(last.body).slice(0, 140) : "",
          lastMessageAt: row.last_message_at,
          unread:
            folder === "inbox" &&
            (Boolean(myRecipient && !myRecipient.read_at) ||
              Boolean(mine && last && last.author_profile_id !== session.userId)),
          recipientCount: threadRecipients.length,
          recipientScope,
          attachmentCount: attachmentCount.get(row.id) ?? 0,
          mine,
          folder: resolvedFolder,
          allowReplies: row.allow_replies,
          ccCount: listMeta.ccCount,
          listTags: listMeta.listTags,
          isFavorite,
        } satisfies MessageThreadSummary;
      })
      .filter((row): row is MessageThreadSummary => row !== null);
  },
);

/** One-way circulares sent by this admin, segmented by audience lane. */
export const loadCircularSentHistory = cache(
  async (audience: CircularAudienceSlug): Promise<MessageThreadSummary[]> => {
    const session = await getCommsActor();
    if (!session) return [];
    const locale = await getRequestLocale();
    const labels = counterpartLabels(locale);

    const { data: threads, error } = await session.actor
      .from("threads")
      .select(THREAD_COLUMNS)
      .eq("allow_replies", false)
      .eq("created_by", session.userId)
      .order("last_message_at", { ascending: false })
      .limit(200);
    if (error || !threads) return [];

    const rows = (threads as ThreadRow[]).filter((row) => threadMatchesCircularAudience(row, audience));
    const ids = rows.map((row) => row.id);
    if (ids.length === 0) return [];

    const [{ data: recipients }, { data: messages }, { data: attachments }] = await Promise.all([
      session.actor
        .from("thread_recipients")
        .select("thread_id, profile_id, recipient_key, role, read_at, display_name, profiles(name)")
        .in("thread_id", ids),
      session.actor
        .from("messages")
        .select("thread_id, body, created_at, author_profile_id, profiles(name)")
        .in("thread_id", ids)
        .order("created_at", { ascending: true }),
      session.actor.from("message_attachments").select("thread_id").in("thread_id", ids),
    ]);

    const recipientRows = (recipients ?? []) as RecipientRow[];
    const messageRows = (messages ?? []) as MessageRow[];
    const attachmentCount = new Map<string, number>();
    for (const row of (attachments ?? []) as Array<{ thread_id: string }>) {
      attachmentCount.set(row.thread_id, (attachmentCount.get(row.thread_id) ?? 0) + 1);
    }

    return rows.map((row) => {
      const threadRecipients = recipientRows.filter((item) => item.thread_id === row.id);
      const threadMessages = messageRows.filter((item) => item.thread_id === row.id);
      const last = threadMessages[threadMessages.length - 1];
      const audienceKind = row.audience === "group" ? "group" : "individual";
      const className = classLabel(row.classes);
      const recipientNames = threadRecipients.map(
        (item) => nameOf(item.profiles) || item.display_name || "",
      );
      const recipientScope = parseRecipientScope(row.recipient_scope);
      const listMeta = buildListMeta(row, threadRecipients, true, last);

      return {
        id: row.id,
        subject: row.subject?.trim() || "(Sin asunto)",
        audience: audienceKind,
        className,
        counterpart: formatSentCounterpart(
          recipientNames,
          audienceKind,
          className,
          threadRecipients.length,
          labels,
          recipientScope,
        ),
        authorName: listMeta.authorName,
        preview: last ? docToPlainText(last.body).slice(0, 140) : "",
        lastMessageAt: row.last_message_at,
        unread: false,
        recipientCount: threadRecipients.length,
        recipientScope,
        attachmentCount: attachmentCount.get(row.id) ?? 0,
        mine: true,
        folder: "sent" as const,
        allowReplies: false,
        ccCount: listMeta.ccCount,
        listTags: listMeta.listTags,
        isFavorite: false,
      } satisfies MessageThreadSummary;
    });
  },
);

export const loadThreadDetail = cache(
  async (threadId: string): Promise<MessageThreadDetail | null> => {
    const session = await getCommsActor();
    if (!session) return null;
    const locale = await getRequestLocale();
    const detailLabels = counterpartLabels(locale);

    const { data: thread, error } = await session.actor
      .from("threads")
      .select(THREAD_COLUMNS)
      .eq("id", threadId)
      .maybeSingle();
    if (error || !thread) return null;

    const row = thread as ThreadRow;

    const [{ data: messages }, { data: recipients }, { data: attachmentRows }, { data: state }] =
      await Promise.all([
        session.actor
          .from("messages")
          .select("id, body, created_at, author_profile_id, profiles(name)")
          .eq("thread_id", threadId)
          .order("created_at", { ascending: true }),
        session.actor
          .from("thread_recipients")
          .select("profile_id, recipient_key, role, read_at, display_name, profiles(name)")
          .eq("thread_id", threadId),
        session.actor
          .from("message_attachments")
          .select("id, file_name, storage_path, mime_type, size_bytes")
          .eq("thread_id", threadId)
          .order("created_at", { ascending: true }),
        session.actor
          .from("message_thread_state")
          .select("folder, is_favorite")
          .eq("owner_profile_id", session.userId)
          .eq("thread_id", threadId)
          .maybeSingle(),
      ]);

    const attachments = (attachmentRows ?? []) as Array<{
      id: string;
      file_name: string;
      storage_path: string;
      mime_type: string | null;
      size_bytes: number | null;
    }>;
    const messageRows = (messages ?? []) as Array<{
      id: string;
      body: RichTextDoc;
      created_at: string;
      author_profile_id: string | null;
      profiles: NameEmbed;
    }>;

    const embedPaths = [
      ...new Set([
        ...attachments.map((item) => item.storage_path),
        ...messageRows.flatMap((message) => collectEmbedPaths(message.body)),
      ]),
    ];
    let signedUrls = new Map<string, string>();
    if (embedPaths.length > 0) {
      const { data: signed } = await session.actor.storage
        .from("message-attachments")
        .createSignedUrls(embedPaths, ATTACHMENT_SIGNED_URL_TTL_SEC);
      signedUrls = new Map(
        (signed ?? [])
          .filter((item) => item.path && item.signedUrl)
          .map((item) => [item.path as string, item.signedUrl as string]),
      );
    }
    const recipientRows = (recipients ?? []) as Array<{
      profile_id: string | null;
      recipient_key: string | null;
      role: "to" | "cc";
      read_at: string | null;
      display_name: string | null;
      profiles: NameEmbed;
    }>;

    const mine = row.created_by === session.userId;
    const last = messageRows[messageRows.length - 1];
    const stateRow = state as { folder: StoredMessageFolder; is_favorite: boolean } | null;
    const audience = row.audience === "group" ? "group" : "individual";
    const className = classLabel(row.classes);
    const recipientNames = recipientRows.map(
      (item) => nameOf(item.profiles) || item.display_name || "",
    );
    const recipientScope = parseRecipientScope(row.recipient_scope);
    const listMeta = buildListMeta(
      row,
      recipientRows.map((item) => ({ ...item, thread_id: threadId })),
      mine,
      last ? { ...last, thread_id: threadId } : undefined,
    );

    return {
      allowReplies: row.allow_replies,
      classId: row.class_id,
      summary: {
        id: row.id,
        subject: row.subject?.trim() || "(Sin asunto)",
        audience,
        className,
        counterpart: mine
          ? formatSentCounterpart(
              recipientNames,
              audience,
              className,
              recipientRows.length,
              detailLabels,
              recipientScope,
            )
          : nameOf(row.profiles) || "Administración",
        authorName: listMeta.authorName,
        preview: last ? docToPlainText(last.body).slice(0, 140) : "",
        lastMessageAt: row.last_message_at,
        unread: false,
        recipientCount: recipientRows.length,
        recipientScope,
        attachmentCount: attachments.length,
        mine,
        folder: resolveThreadFolder(
          stateRow?.folder,
          mine,
          last?.author_profile_id,
          session.userId,
        ),
        allowReplies: row.allow_replies,
        ccCount: listMeta.ccCount,
        listTags: listMeta.listTags,
        isFavorite: stateRow?.is_favorite ?? false,
      },
      messages: messageRows.map((message) => ({
        id: message.id,
        authorName: nameOf(message.profiles),
        body: injectEmbedUrls(message.body, signedUrls) ?? message.body,
        createdAt: message.created_at,
        mine: message.author_profile_id === session.userId,
      })),
      recipients: recipientRows.map((recipient) => ({
        profileId: recipient.profile_id ?? recipient.recipient_key ?? "",
        name: nameOf(recipient.profiles) || recipient.display_name || "",
        role: recipient.role,
        readAt: recipient.read_at,
      })),
      attachments: attachments.map((attachment) => ({
        id: attachment.id,
        name: attachment.file_name,
        url: signedUrls.get(attachment.storage_path) ?? "",
        mimeType: attachment.mime_type,
        sizeBytes: attachment.size_bytes,
      })),
    };
  },
);
