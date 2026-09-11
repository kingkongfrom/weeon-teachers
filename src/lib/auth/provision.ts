import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { authEmailFor, isEmailLogin, normalizeUsername } from "@/lib/auth/school";
import { randomTempPassword } from "@/lib/auth/password";

const LOOKUP_ERROR = "No encontramos esa cuenta. Revise su usuario o correo.";
const AMBIGUOUS_ERROR =
  "Ese usuario existe en más de un colegio. Ingrese el correo de la cuenta.";
const ADMIN_EMAIL_ERROR =
  "Ese correo pertenece a una cuenta de administración del colegio. Los administradores no pueden ingresar como docentes; use un correo distinto para el docente.";
const EMAIL_IN_USE_ERROR =
  "Ese correo ya está registrado en otra cuenta. Use un correo distinto para el docente.";

export type TenantRow = {
  id: string;
  name: string;
  slug: string | null;
  subdomain: string;
  saber_code: string | null;
};

export type RosterRow = {
  id: string;
  tenant_id: string;
  role: string;
  username: string;
  display_name: string | null;
  email: string | null;
  source_kind: string;
  source_id: string;
  account_status: string;
  auth_user_id: string | null;
};

export type PreparedTeacher = {
  tenant: TenantRow;
  roster: RosterRow | null;
  email: string;
  needsPassword: boolean;
  signInPassword?: string;
};

const TENANT_SELECT = "id, name, slug, subdomain, saber_code";
const ROSTER_SELECT =
  "id, tenant_id, role, username, display_name, email, source_kind, source_id, account_status, auth_user_id";

async function loadTenant(
  admin: SupabaseClient,
  tenantId: string,
): Promise<TenantRow | null> {
  const { data } = await admin
    .from("tenants")
    .select(TENANT_SELECT)
    .eq("id", tenantId)
    .maybeSingle();
  return (data as TenantRow | null) ?? null;
}

async function findExistingEmailLogin(
  admin: SupabaseClient,
  usernameRaw: string,
): Promise<PreparedTeacher | { error: string } | null> {
  if (!isEmailLogin(usernameRaw)) return null;

  const email = normalizeUsername(usernameRaw);
  const select = "id, tenant_id, role, email, auth_email, account_status";
  const [{ data: byEmail }, { data: byAuthEmail }] = await Promise.all([
    admin.from("profiles").select(select).eq("email", email),
    admin.from("profiles").select(select).eq("auth_email", email),
  ]);

  const unique = new Map<string, Record<string, unknown>>();
  for (const row of [...(byEmail ?? []), ...(byAuthEmail ?? [])]) {
    unique.set(String(row.id), row as Record<string, unknown>);
  }
  const matches = [...unique.values()].filter((row) => {
    const role = String(row.role ?? "");
    return role === "teacher" || role === "admin";
  });

  if (matches.length === 0) return { error: LOOKUP_ERROR };
  if (matches.length > 1) return { error: AMBIGUOUS_ERROR };

  const profile = matches[0];
  const status = String(profile.account_status ?? "active");
  if (status !== "active") return null;

  const tenant = await loadTenant(admin, String(profile.tenant_id));
  if (!tenant) return { error: LOOKUP_ERROR };

  return {
    tenant,
    roster: null,
    email: String(profile.auth_email || profile.email || email).toLowerCase(),
    needsPassword: false,
  };
}

export async function findTeacherRoster(
  admin: SupabaseClient,
  usernameRaw: string,
): Promise<{ tenant: TenantRow; roster: RosterRow } | { error: string }> {
  const username = normalizeUsername(usernameRaw);
  if (!username) return { error: LOOKUP_ERROR };

  const { data, error } = await admin
    .from("roster_accounts")
    .select(ROSTER_SELECT)
    .eq("username", username)
    .eq("role", "teacher");

  if (error) return { error: LOOKUP_ERROR };

  const rows = (data ?? []) as RosterRow[];
  if (rows.length === 0) return { error: LOOKUP_ERROR };
  if (rows.length > 1) return { error: AMBIGUOUS_ERROR };

  const roster = rows[0];
  const tenant = await loadTenant(admin, roster.tenant_id);
  if (!tenant) return { error: LOOKUP_ERROR };

  return { tenant, roster };
}

/**
 * Role of an existing profile that already owns this Auth email within the
 * tenant, ignoring teacher rows (those are reusable by provisioning). Used to
 * fail with an explicit message instead of a duplicate-email error.
 */
async function findConflictingAccountRole(
  admin: SupabaseClient,
  email: string,
  tenantId: string,
): Promise<string | null> {
  const normalized = email.trim().toLowerCase();
  const [{ data: byEmail }, { data: byAuthEmail }] = await Promise.all([
    admin
      .from("profiles")
      .select("role")
      .eq("email", normalized)
      .eq("tenant_id", tenantId),
    admin
      .from("profiles")
      .select("role")
      .eq("auth_email", normalized)
      .eq("tenant_id", tenantId),
  ]);

  const roles = [...(byEmail ?? []), ...(byAuthEmail ?? [])].map((row) =>
    String(row.role ?? ""),
  );
  return roles.find((role) => role && role !== "teacher") ?? null;
}

async function findReusableTeacherAuth(
  admin: SupabaseClient,
  email: string,
  tenantId: string,
): Promise<string | null> {
  const normalized = email.trim().toLowerCase();
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error || !data?.users?.length) return null;
    const match = data.users.find(
      (user) => user.email?.trim().toLowerCase() === normalized,
    );
    if (!match) {
      if (data.users.length < 200) return null;
      continue;
    }
    const role = String(match.app_metadata?.role ?? "");
    const tenant = String(match.app_metadata?.tenant_id ?? "");
    if (role && role !== "teacher") return null;
    if (tenant && tenant !== tenantId) return null;
    return match.id;
  }
  return null;
}

export async function prepareTeacherLogin(
  admin: SupabaseClient,
  username: string,
): Promise<PreparedTeacher | { error: string }> {
  const existing = await findExistingEmailLogin(admin, username);
  if (existing) return existing;

  const found = await findTeacherRoster(admin, username);
  if ("error" in found) return found;

  const { tenant, roster } = found;
  const email = authEmailFor({
    username: roster.username,
    email: roster.email,
    slug: tenant.slug,
    subdomain: tenant.subdomain,
  });
  const displayName = roster.display_name?.trim() || roster.username;
  const needsPassword = roster.account_status !== "active";
  let userId = roster.auth_user_id;
  let signInPassword: string | undefined;

  async function resolveLinkedProfileRole(
    authUserId: string,
    tenantId: string,
  ): Promise<"admin" | "teacher"> {
    const { data: existingProfile } = await admin
      .from("profiles")
      .select("role")
      .eq("id", authUserId)
      .maybeSingle();
    if (existingProfile?.role === "admin") return "admin";

    const { data: auditRow } = await admin
      .from("tenant_admin_log")
      .select("admin_user_id")
      .eq("admin_user_id", authUserId)
      .eq("tenant_id", tenantId)
      .limit(1)
      .maybeSingle();
    if (auditRow) return "admin";

    const { data: inviteRow } = await admin
      .from("admin_invites")
      .select("accepted_user_id")
      .eq("accepted_user_id", authUserId)
      .eq("tenant_id", tenantId)
      .limit(1)
      .maybeSingle();
    if (inviteRow) return "admin";

    return "teacher";
  }

  if (!userId) {
    const conflictRole = await findConflictingAccountRole(admin, email, tenant.id);
    if (conflictRole === "admin") {
      return { error: ADMIN_EMAIL_ERROR };
    }
    if (conflictRole) {
      return { error: EMAIL_IN_USE_ERROR };
    }

    const tempPassword = randomTempPassword();
    const created = await admin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        role: "teacher",
        tenant_id: tenant.id,
        username: roster.username,
        name: displayName,
      },
      app_metadata: {
        role: "teacher",
        tenant_id: tenant.id,
        account_status: "pending_first_login",
      },
    });

    if (created.error || !created.data.user) {
      const existingId = await findReusableTeacherAuth(admin, email, tenant.id);
      if (!existingId) {
        return { error: "No se pudo preparar la cuenta. Intente de nuevo." };
      }
      userId = existingId;
    } else {
      userId = created.data.user.id;
      signInPassword = tempPassword;
    }

    const { error: rosterError } = await admin
      .from("roster_accounts")
      .update({ auth_user_id: userId })
      .eq("id", roster.id);
    if (rosterError) {
      return { error: "No se pudo vincular el usuario." };
    }
  }

  const linkedRole = await resolveLinkedProfileRole(userId, tenant.id);

  if (needsPassword && !signInPassword) {
    const tempPassword = randomTempPassword();
    const { error: resetError } = await admin.auth.admin.updateUserById(userId, {
      password: tempPassword,
      app_metadata: {
        role: linkedRole,
        tenant_id: tenant.id,
        account_status: "pending_first_login",
      },
    });
    if (resetError) {
      return { error: "No se pudo preparar la contraseña inicial." };
    }
    signInPassword = tempPassword;
  }

  const now = new Date().toISOString();
  const { error: profileError } = await admin.from("profiles").upsert(
    {
      id: userId,
      tenant_id: tenant.id,
      email,
      auth_email: email,
      name: displayName,
      role: linkedRole,
      username: roster.username,
      active: true,
      account_status: needsPassword ? "pending_first_login" : "active",
      provisioned_at: now,
    },
    { onConflict: "id" },
  );
  if (profileError) {
    return { error: "No se pudo guardar el perfil del docente." };
  }

  if (roster.source_kind === "teacher" && roster.source_id) {
    await admin
      .from("teachers")
      .update({ profile_id: userId })
      .eq("id", roster.source_id)
      .eq("tenant_id", tenant.id);
    await admin
      .from("classes")
      .update({ teacher_profile_id: userId })
      .eq("teacher_id", roster.source_id)
      .eq("tenant_id", tenant.id);
  }

  return {
    tenant,
    roster: { ...roster, auth_user_id: userId },
    email,
    needsPassword,
    signInPassword,
  };
}
