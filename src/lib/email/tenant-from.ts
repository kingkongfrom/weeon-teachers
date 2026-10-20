/** Aligns with `weeon-tenants/lib/email/tenant-from.ts` (compose history headers). */

const PLATFORM_FROM = "Weeon School <no-responder@weeon.school>";

export type TenantEmailIdentity = {
  displayName: string;
  from: string;
  replyTo: string | null;
};

export function stripWeeonFromSuffix(name: string): string {
  return name.replace(/\s+via\s+weeon\s*$/i, "").trim();
}

export function sanitizeEmailDisplayName(value: string): string {
  return value.replace(/[\r\n<>"]/g, " ").replace(/\s+/g, " ").trim().slice(0, 60);
}

export function isReplyEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 200;
}

export function platformMailbox(rawFrom = process.env.RESEND_FROM): string {
  const raw = rawFrom?.trim() || PLATFORM_FROM;
  const match = raw.match(/<([^>]+)>/);
  const email = (match?.[1] ?? raw).trim();
  return email.includes("@") ? email : "no-responder@weeon.school";
}

export function tenantFromHeader(displayName: string, mailbox = platformMailbox()): string {
  const name = stripWeeonFromSuffix(sanitizeEmailDisplayName(displayName));
  if (!name) return process.env.RESEND_FROM?.trim() || PLATFORM_FROM;
  return `${name} <${mailbox}>`;
}

export function formatComposeFromDisplay(identity: TenantEmailIdentity): string {
  const name = stripWeeonFromSuffix(identity.displayName.trim());
  if (identity.replyTo) {
    return name ? `${name} <${identity.replyTo}>` : identity.replyTo;
  }
  if (name) return name;
  return identity.from.trim();
}

export function tenantEmailIdentity(input: {
  displayName?: string | null;
  replyTo?: string | null;
  fallbackName?: string | null;
}): TenantEmailIdentity {
  const displayName = stripWeeonFromSuffix(
    sanitizeEmailDisplayName(input.displayName ?? "") ||
      sanitizeEmailDisplayName(input.fallbackName ?? ""),
  );
  const reply = input.replyTo?.trim().toLowerCase() ?? "";
  return {
    displayName,
    from: tenantFromHeader(displayName),
    replyTo: isReplyEmail(reply) ? reply : null,
  };
}
/** Mirrors `weeon-tenants/lib/email/tenant-from.ts` (classroom notice sender). */
export function isTeacherSenderEmail(value: string | null | undefined): boolean {
  const email = value?.trim().toLowerCase() ?? "";
  if (!isReplyEmail(email)) return false;
  if (email.endsWith(".accounts.weeon.school") || email.endsWith(".accounts.weeon.cr")) {
    return false;
  }
  return !email.endsWith("@example.com");
}

/** Identity shown in compose: the teacher who writes, with the school fallback. */
export function senderIdentityForAuthor(
  school: TenantEmailIdentity,
  author: { name?: string | null; email?: string | null },
): TenantEmailIdentity {
  const email = author.email?.trim().toLowerCase() ?? "";
  if (!isTeacherSenderEmail(email)) return school;

  const authorName = sanitizeEmailDisplayName(author.name ?? "").slice(0, 40);
  const displayName = authorName
    ? school.displayName
      ? `${authorName} · ${school.displayName}`
      : authorName
    : school.displayName;

  return { displayName, from: tenantFromHeader(displayName), replyTo: email };
}