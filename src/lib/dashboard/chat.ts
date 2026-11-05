import "server-only";

import { cache } from "react";
import { getTeacherSession } from "@/lib/auth/teacher-session";
import { createSessionClient } from "@/lib/supabase/session";
import { avatarUrlsBySubjectKey } from "@/lib/comms/profile-avatar-urls";
import {
  loadGuardianChatDirectory,
  lookupGuardianStudentContext,
} from "@/lib/dashboard/chat-guardian-context";
import { loadAdminTeacherChatConversations, loadAdminTeacherChatDetail } from "@/lib/dashboard/admin-teacher-chat";
import { cleanGuardianDisplayName } from "@/lib/messages/chat-display";
import { loadSchoolLogoUrl } from "@/lib/dashboard/school";
import type {
  ChatConversationDetail,
  ChatConversationSummary,
  ChatContact,
  ChatMessageItem,
} from "@/lib/messages/chat-model";

/** The role badge: who the person is, not which channel the thread travels over. */
type CounterpartKind = ChatConversationSummary["kind"];

export type {
  ChatConversationDetail,
  ChatConversationSummary,
  ChatMessageItem,
} from "@/lib/messages/chat-model";

type ConversationListRow = {
  id: string;
  counterpart_name: string | null;
  last_body: string | null;
  last_at: string | null;
  unread: boolean | null;
  context_label?: string | null;
  student_name?: string | null;
};

/** Realtime channel config for the browser client (anon key is public). */
export type ChatRealtimeConfig = { url: string; anonKey: string };

/** Administración, encargados, and students the teacher can start a chat with. */
export const loadChatGuardianContacts = cache(async (): Promise<ChatContact[]> => {
  const session = await getTeacherSession();
  if (!session) return [];
  const supabase = await createSessionClient();
  const { data, error } = await supabase.rpc("list_message_contacts");
  if (error || !data) return [];

  const seen = new Set<string>();
  const contacts: ChatContact[] = [];
  for (const row of data as Array<{
    recipient_key: string;
    full_name: string;
    kind: string;
    context: string | null;
    student_name?: string | null;
  }>) {
    if (row.kind !== "parent" && row.kind !== "student") continue;
    const key = row.recipient_key?.trim();
    const name = row.full_name?.trim();
    if (!key || !name) continue;
    const context = row.context?.trim() ?? "";
    const studentName =
      row.kind === "student" ? "" : (row.student_name?.trim() ?? "");
    // The RPC emits one row per (account, class): a guardian covering two
    // classes legitimately appears twice, each labelled with its class and
    // child. Collapse only exact repeats of the same account in the same class.
    const dedupe = `${row.kind}::${key}::${context}::${studentName}`;
    if (seen.has(dedupe)) continue;
    seen.add(dedupe);
    contacts.push({
      key,
      name,
      context,
      studentName,
      kind: row.kind,
    });
  }

  contacts.sort((a, b) => {
    const byClass = a.context.localeCompare(b.context, "es");
    if (byClass !== 0) return byClass;
    return a.name.localeCompare(b.name, "es");
  });

  const photos = await avatarUrlsBySubjectKey(
    supabase,
    contacts.map((contact) => contact.key),
  );
  return contacts.map((contact) => ({
    ...contact,
    avatarUrl: photos.get(contact.key) ?? null,
  }));
});

/** Guardian + school-admin conversations for the signed-in teacher. */
export const loadChatConversations = cache(async (): Promise<ChatConversationSummary[]> => {
  const session = await getTeacherSession();
  if (!session) return [];
  const supabase = await createSessionClient();

  const [listRes, adminConversations, { map, contacts }, keysRes] = await Promise.all([
    supabase.rpc("list_chat_conversations"),
    loadAdminTeacherChatConversations(),
    loadGuardianChatDirectory(session),
    supabase
      .from("chat_conversations")
      .select("id, recipient_key")
      .eq("teacher_profile_id", session.userId),
  ]);

  /*
   * Authoritative PERSON role per conversation, fetched once.
   *
   * The badge describes the person, not the channel: someone who is school
   * leadership stays "Dirección escolar" even in a thread that travels over the
   * guardian channel because they also have a child at the school.
   *
   * So `kind` may now be "admin" on a guardian-channel row. It must never be guessed
   * from names -- an earlier version compared the student's name with the
   * counterpart's and mislabelled real people.
   *
   * A missing entry means "cannot resolve this person"; the row keeps the channel's
   * default rather than inventing a role.
   */
  const schoolLogoUrl = await loadSchoolLogoUrl(session.tenantId);
  const conversationIds = (listRes.data ?? [])
    .map((row: { id: unknown }) => row.id as string)
    .filter(Boolean);
  const kindByConversation = new Map<string, CounterpartKind>();
  if (conversationIds.length > 0) {
    const { data: kinds } = await supabase.rpc("chat_counterpart_kinds", {
      p_conversation_ids: conversationIds,
    });
    for (const row of (kinds ?? []) as Array<{
      conversation_id: string;
      counterpart_kind: string | null;
    }>) {
      const resolved = row.counterpart_kind;
      if (
        resolved === "parent" ||
        resolved === "student" ||
        resolved === "admin" ||
        resolved === "teacher"
      ) {
        kindByConversation.set(row.conversation_id, resolved);
      }
    }
  }
  const guardianRows: ChatConversationSummary[] = [];
  if (listRes.data && !listRes.error) {
    const recipientKeyById = new Map<string, string>();
    for (const row of keysRes.data ?? []) {
      recipientKeyById.set(row.id as string, row.recipient_key as string);
    }

    const contactByKeyClass = new Map(
      contacts.map((contact) => [`${contact.key}::${contact.context}`, contact]),
    );
    const avatarUrls = await avatarUrlsBySubjectKey(supabase, [...recipientKeyById.values()]);

    for (const row of listRes.data as ConversationListRow[]) {
      const recipientKey = recipientKeyById.get(row.id) ?? "";
      const fromMap = lookupGuardianStudentContext(map, recipientKey, null, null);
      const contact =
        [...contactByKeyClass.values()].find((item) => item.key === recipientKey) ?? null;

      const classLabel =
        row.context_label?.trim() || contact?.context || fromMap?.classLabel || "";
      const studentName =
        row.student_name?.trim() ||
        contact?.studentName ||
        fromMap?.studentName ||
        row.counterpart_name?.trim() ||
        "";

      if (studentName.trim().length === 0) continue;

      /*
       * kind decides the badge the teacher sees -- ENCARGADO vs ESTUDIANTE.
       *
       * The RPC returns an AUTHORITATIVE kind, derived from roster_accounts
       * .source_kind = 'student' | 'guardian'. contact carries it. When it is
       * absent -- a conversation whose counterpart is no longer in the contact
       * list -- we must NOT guess from names: the old fallback compared the
       * student's name with the counterpart's name and called it a student when
       * they matched. A parent who happens to share the child's name (or an
       * unnamed guardian whose display name was cleaned to the child's) was then
       * shown as ESTUDIANTE, and everyone else as ENCARGADO -- wrong badges for
       * real people.
       *
       * With no evidence the only honest label is the guardian channel's default,
       * and the row is left to show its context label instead of asserting a role.
       */
      // Person-level: may be "admin" on this channel when the counterpart holds a
      // staff role (see the fetch above). Never guessed from names.
      const personKind: CounterpartKind =
        kindByConversation.get(row.id) ??
        (contact?.kind === "student" ? "student" : "parent");

      /*
       * School leadership is represented by the SCHOOL, not by a personal photo.
       *
       * The owner's rule: "if the user is from dirección, the avatar must be the
       * school's logo". A dirección account answers as the institution, so showing
       * one person's face would say the message came from that individual. The logo
       * also matches the badge -- both then describe the role, not the person.
       *
       * Falls back to the normal avatar when the school has no logo uploaded, so
       * this never renders an empty circle.
       */
      const personAvatar =
        personKind === "admin"
          ? (schoolLogoUrl ?? (recipientKey ? (avatarUrls.get(recipientKey) ?? null) : null))
          : recipientKey
            ? (avatarUrls.get(recipientKey) ?? null)
            : null;

      guardianRows.push({
        id: row.id,
        channel: "guardian",
        kind: personKind,
        counterpartName: cleanGuardianDisplayName(row.counterpart_name),
        classLabel,
        studentName,
        lastBody: row.last_body ?? "",
        lastAt: row.last_at ?? new Date(0).toISOString(),
        unread: Boolean(row.unread),
        avatarUrl: personAvatar,
        // Staff rows chain logo -> photo -> initials; everyone else is a face.
        schoolLogoUrl: personKind === "admin" ? schoolLogoUrl : null,
      });
    }
  }

  const adminRows: ChatConversationSummary[] = adminConversations.map((row) => ({
    id: row.id,
    channel: "admin" as const,
    kind: "admin" as const,
    counterpartName: row.counterpartName,
    classLabel: "",
    studentName: "",
    lastBody: row.preview,
    lastAt: row.lastMessageAt,
    unread: row.unread,
    // Same rule as the guardian channel: dirección shows the school, not a face.
    avatarUrl: schoolLogoUrl ?? row.avatarUrl,
    schoolLogoUrl,
  }));

  return [...guardianRows, ...adminRows].sort(
    (a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime(),
  );
});

/** One chat: guardian or school-admin thread. Marks nothing read (the client does). */
export const loadChatConversation = cache(
  async (conversationId: string): Promise<ChatConversationDetail | null> => {
    const session = await getTeacherSession();
    if (!session) return null;

    const adminDetail = await loadAdminTeacherChatDetail(conversationId);
    if (adminDetail) {
      return {
        id: adminDetail.id,
        channel: "admin",
        counterpartName: adminDetail.counterpartName,
        classLabel: "",
        studentName: "",
        otherReadAt: adminDetail.otherReadAt,
        /*
         * Every participant on the admin channel is school leadership, so this
         * header shows the school's logo rather than one person's face -- the same
         * rule the list row already applies. Without this the row showed the logo
         * and opening the thread replaced it with a photo.
         */
        avatarUrl: (await loadSchoolLogoUrl(session.tenantId)) ?? adminDetail.avatarUrl,
        messages: adminDetail.messages.map((message) => ({
          id: message.id,
          body: message.body,
          createdAt: message.createdAt,
          mine: message.mine,
          authorName: message.mine ? session.name : adminDetail.counterpartName,
        })),
      };
    }

    const supabase = await createSessionClient();

    const { data: conversation, error } = await supabase
      .from("chat_conversations")
      .select("id, teacher_profile_id, recipient_key, recipient_name, recipient_last_read_at")
      .eq("id", conversationId)
      .maybeSingle();
    if (error || !conversation) return null;

    const row = conversation as {
      id: string;
      teacher_profile_id: string;
      recipient_key: string;
      recipient_name: string | null;
      recipient_last_read_at: string | null;
    };

    const otherReadAt = row.recipient_last_read_at;

    const mine = row.teacher_profile_id === session.userId;
    let counterpartName = cleanGuardianDisplayName(row.recipient_name);
    if (!mine) {
      const { data: teacher } = await supabase
        .from("profiles")
        .select("name")
        .eq("id", row.teacher_profile_id)
        .maybeSingle();
      counterpartName = (teacher as { name?: string } | null)?.name?.trim() || "Docente";
    }

    const { map, contacts } = await loadGuardianChatDirectory(session);
    const contact = contacts.find((item) => item.key === row.recipient_key) ?? null;
    const fromMap = lookupGuardianStudentContext(map, row.recipient_key, contact?.context, contact?.classId);

    const classLabel = contact?.context || fromMap?.classLabel || "";
    const studentName = contact?.studentName || fromMap?.studentName || "";

    const counterpartKey = mine ? row.recipient_key : row.teacher_profile_id;
    /*
     * Same role and avatar rules as the list, because the thread HEADER showed a
     * personal photo for a conversation the list was labelling from the roster. The
     * owner saw the mismatch: the row said one thing and the header another.
     */
    const [photos, { data: kinds }, { data: messages }] = await Promise.all([
      avatarUrlsBySubjectKey(supabase, [counterpartKey]),
      supabase.rpc("chat_counterpart_kinds", { p_conversation_ids: [conversationId] }),
      supabase
        .from("chat_messages")
        .select("id, body, author_profile_id, created_at, reply_to_id, reply_to_sender_name, reply_to_preview, reply_to_created_at")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true }),
    ]);

    // Dirección answers as the school, not as one person.
    const resolvedKind =
      (kinds as Array<{ counterpart_kind: string | null }> | null)?.[0]?.counterpart_kind ??
      null;
    const headerLogo =
      resolvedKind === "admin" ? await loadSchoolLogoUrl(session.tenantId) : null;
    const headerAvatar = headerLogo ?? (photos.get(counterpartKey) ?? null);

    return {
      id: conversationId,
      channel: "guardian",
      counterpartName,
      classLabel,
      studentName,
      otherReadAt: otherReadAt ?? null,
      avatarUrl: headerAvatar,
    // The logo, so the header avatar can style it as a mark rather than crop it.
    schoolLogoUrl: headerLogo,
      messages: (
        (messages ?? []) as Array<{
          id: string;
          body: string;
          author_profile_id: string | null;
          created_at: string;
          reply_to_id: string | null;
          reply_to_sender_name: string | null;
          reply_to_preview: string | null;
          reply_to_created_at: string | null;
        }>
      ).map((message) => {
        const isMine = message.author_profile_id === session.userId;
        return {
          id: message.id,
          body: message.body,
          createdAt: message.created_at,
          mine: isMine,
          authorName: isMine ? session.name : counterpartName,
          /*
           * The quote is a snapshot stored with the reply (docs/chat-replies.md
           * D1), so no join is needed -- and it still renders if the original is
           * gone. Only built when reply_to_id is set, so every pre-existing
           * message keeps exactly the shape it had.
           */
          ...(message.reply_to_id
            ? {
                replyTo: {
                  id: message.reply_to_id,
                  senderName: message.reply_to_sender_name ?? '',
                  preview: message.reply_to_preview ?? '',
                  createdAt: message.reply_to_created_at ?? '',
                },
              }
            : {}),
        };
      }),
    };
  },
);
