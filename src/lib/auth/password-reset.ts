import "server-only";

import { createHash, randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { teachersOrigin } from "@/lib/supabase/env";
import { sendPasswordResetEmail } from "@/lib/auth/reset-email";

export const PASSWORD_RESET_TTL_MS = 24 * 60 * 60 * 1000;

export type ResetMint =
  | { success: true; email: string }
  | { success: false; error: string };

function tokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function newToken(): string {
  return randomBytes(32).toString("base64url");
}

export type ResetTarget = {
  id: string;
  email: string;
  tenantId: string;
  tenantName: string;
};

/**
 * Finds a teacher (or, for real-email access, an existing school admin) by the
 * email they use to sign in — either `email` or `auth_email` on profiles.
 * Returns null for any other user or when not found, so callers stay
 * enumeration-safe.
 */
export async function findTeacherResetTarget(
  client: SupabaseClient,
  email: string,
): Promise<ResetTarget | null> {
  const normalized = email.trim().toLowerCase();
  const select = "id, email, auth_email, tenant_id, role, account_status";
  const [{ data: byEmail, error: errEmail }, { data: byAuthEmail, error: errAuthEmail }] =
    await Promise.all([
      client.from("profiles").select(select).eq("email", normalized),
      client.from("profiles").select(select).eq("auth_email", normalized),
    ]);
  if (errEmail || errAuthEmail) return null;

  const unique = new Map<string, (typeof byEmail)[number]>();
  for (const row of [...(byEmail ?? []), ...(byAuthEmail ?? [])]) {
    const role = String(row.role ?? "");
    if (role !== "teacher" && role !== "admin") continue;
    if (String(row.account_status ?? "") === "pending_first_login") continue;
    unique.set(String(row.id), row);
  }
  if (unique.size !== 1) return null;

  const profile = [...unique.values()][0];
  const { data: tenant } = await client
    .from("tenants")
    .select("name")
    .eq("id", profile.tenant_id)
    .maybeSingle();

  return {
    id: String(profile.id),
    email: String(profile.auth_email || profile.email || normalized).toLowerCase(),
    tenantId: String(profile.tenant_id),
    tenantName: tenant?.name ?? "Su institución",
  };
}

/**
 * Creates a single-use reset row and sends the branded reset email. Only runs
 * when the email maps to a real teacher; otherwise returns success:true anyway
 * (generic, enumeration-safe).
 */
export async function mintPasswordReset(
  client: SupabaseClient,
  emailInput: string,
  requestOrigin: string | null,
): Promise<ResetMint> {
  const target = await findTeacherResetTarget(client, emailInput);
  if (!target) {
    // Always claim success (do not reveal whether the address is a teacher).
    return { success: true, email: emailInput.trim().toLowerCase() };
  }

  const token = newToken();
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS);

  const { data: insert, error } = await client
    .from("teacher_password_resets")
    .insert({
      user_id: target.id,
      email: target.email,
      token_hash: tokenHash(token),
      expires_at: expiresAt.toISOString(),
    })
    .select("id")
    .single();

  if (error || !insert) {
    console.error("[password-reset] insert reset failed", error?.message);
    return { success: false, error: "reset.mintFailed" };
  }

  const origin = teachersOrigin(requestOrigin);
  const resetUrl = `${origin}/reset-password?token=${encodeURIComponent(token)}`;
  const sent = await sendPasswordResetEmail({
    to: target.email,
    resetUrl,
    institutionName: target.tenantName,
  });
  if (!sent.success) {
    console.error("[password-reset] send reset email failed", sent.error);
    // Delete ONLY this row so a broken email doesn't leave a usable token.
    await client.from("teacher_password_resets").delete().eq("id", insert.id);
    return { success: false, error: "reset.sendFailed" };
  }

  return { success: true, email: target.email };
}

/**
 * Validates an un-consumed, un-expired token. Returns the reset row when valid.
 */
export async function consumeResettableToken(
  client: SupabaseClient,
  token: string,
): Promise<{ id: string; user_id: string; email: string } | null> {
  if (!token) return null;
  const { data, error } = await client
    .from("teacher_password_resets")
    .select("id, user_id, email, expires_at, consumed_at")
    .eq("token_hash", tokenHash(token))
    .maybeSingle();
  if (error || !data) return null;
  if (data.consumed_at) return null;
  if (new Date(data.expires_at).getTime() <= Date.now()) return null;
  return { id: data.id, user_id: data.user_id, email: data.email };
}

/**
 * Updates the teacher's password (service role) and marks the token used.
 * Returns the target email on success so we can sign them in next.
 */
export async function applyPasswordReset(
  client: SupabaseClient,
  token: string,
  password: string,
): Promise<{ ok: true; userId: string; email: string } | { ok: false; code: string }> {
  const row = await consumeResettableToken(client, token);
  if (!row) {
    return { ok: false, code: "reset.invalidLink" };
  }

  const { error } = await client.auth.admin.updateUserById(row.user_id, {
    password,
  });
  if (error) {
    console.error("[password-reset] update password failed", error.message);
    return { ok: false, code: "reset.updateFailed" };
  }

  const { error: markError } = await client
    .from("teacher_password_resets")
    .update({ consumed_at: new Date().toISOString() })
    .eq("id", row.id);
  if (markError) {
    console.error("[password-reset] mark used failed", markError.message);
  }

  return { ok: true, userId: row.user_id, email: row.email };
}

/** Convenience accessor to a service-role client for password-reset flows. */
export function resetAdminClient(): SupabaseClient {
  return createAdminClient();
}
