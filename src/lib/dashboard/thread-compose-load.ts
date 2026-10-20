import "server-only";

import { threadDetailToComposeSeed } from "@/lib/comms/thread-compose-initial";
import type { MessageDraftRecord } from "@/lib/comms/message-draft";
import { getTeacherSession } from "@/lib/auth/teacher-session";
import { resolveAuthorEmailIdentity } from "@/lib/email/resolve-tenant-email-identity";
import { tenantEmailIdentity } from "@/lib/email/tenant-from";
import { loadCommsGroups } from "@/lib/dashboard/comms-groups";
import { getCommsActor } from "@/lib/dashboard/comms-session";
import { loadMessageContacts, loadThreadDetail } from "@/lib/dashboard/messages";

/** Pre-fill Redactar from an existing thread (parity with school ERP). */
export async function loadThreadComposeSeed(threadId: string): Promise<MessageDraftRecord | null> {
  const detail = await loadThreadDetail(threadId);
  if (!detail) return null;

  const [contacts, commsGroups, teacherSession] = await Promise.all([
    loadMessageContacts(),
    loadCommsGroups(),
    getTeacherSession(),
  ]);
  const groups = commsGroups.map((group) => ({
    id: group.id,
    name: group.name,
    grade: group.grade,
    studentCount: group.studentCount,
    parentCount: group.parentCount,
    teacherCount: group.teacherCount,
  }));

  const senderIdentity = teacherSession?.tenantId
    ? await resolveAuthorEmailIdentity({
        tenantId: teacherSession.tenantId,
        authorProfileId: teacherSession.userId,
      })
    : tenantEmailIdentity({ fallbackName: teacherSession?.name ?? "" });

  const seed = threadDetailToComposeSeed(detail, contacts, groups, senderIdentity);
  return {
    id: `from-thread-${threadId}`,
    subject: seed.subject,
    body: seed.body,
    toSelected: seed.toSelected,
    ccSelected: seed.ccSelected,
    allowReplies: seed.allowReplies,
    sourceThreadHistory: seed.threadHistory,
  };
}
