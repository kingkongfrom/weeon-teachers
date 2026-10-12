import "server-only";

import { tenantEmailIdentity, type TenantEmailIdentity } from "@/lib/email/tenant-from";
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
