import "server-only";

import {
  senderIdentityForAuthor,
  tenantEmailIdentity,
  type TenantEmailIdentity,
} from "@/lib/email/tenant-from";
import { createAdminClient } from "@/lib/supabase/admin";

function readText(settings: unknown, key: string): string {
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) return "";
  const value = (settings as Record<string, unknown>)[key];
  return typeof value === "string" ? value : "";
}

export function identityFromTenantRow(
  settings: unknown,
  institutionName: string | null | undefined,
): TenantEmailIdentity {
  return tenantEmailIdentity({
    displayName: readText(settings, "emailDisplayName"),
    replyTo: readText(settings, "emailReplyTo"),
    fallbackName: institutionName,
  });
}

export async function resolveTenantEmailIdentity(tenantId: string): Promise<TenantEmailIdentity> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("tenants")
    .select("name, settings")
    .eq("id", tenantId)
    .maybeSingle();
  return identityFromTenantRow(data?.settings, data?.name);
}
/**
 * Sender shown in compose: the teacher who writes (name + sign-in email), with
 * the school identity as fallback. Mirrors `resolveAuthorEmailIdentity` in
 * `weeon-tenants` so the chat header and the real notice agree.
 */
export async function resolveAuthorEmailIdentity(input: {
  tenantId: string;
  authorProfileId: string | null | undefined;
}): Promise<TenantEmailIdentity> {
  const school = await resolveTenantEmailIdentity(input.tenantId);
  if (!input.authorProfileId) return school;

  const admin = createAdminClient();
  const [{ data: profile }, { data: teacher }] = await Promise.all([
    admin
      .from("profiles")
      .select("name, email")
      .eq("id", input.authorProfileId)
      .eq("tenant_id", input.tenantId)
      .maybeSingle(),
    admin
      .from("teachers")
      .select("name, email")
      .eq("tenant_id", input.tenantId)
      .eq("profile_id", input.authorProfileId)
      .maybeSingle(),
  ]);

  return senderIdentityForAuthor(school, {
    name: teacher?.name ?? profile?.name ?? null,
    email: teacher?.email ?? profile?.email ?? null,
  });
}