"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createSessionClient } from "@/lib/supabase/session";
import { prepareTeacherLogin } from "@/lib/auth/provision";
import { meetsPasswordRequirements, passwordSchema } from "@/lib/auth/password";

const GENERIC_ERROR = "No encontramos esa cuenta. Revise su usuario o correo.";

export type AuthActionResult = { ok: true } | { ok: false; error: string };

export async function startTeacherLogin(
  username: string,
): Promise<AuthActionResult & { needsPassword?: boolean }> {
  if (!username.trim()) {
    return { ok: false, error: "Ingrese su usuario o correo." };
  }

  let prepared;
  try {
    prepared = await prepareTeacherLogin(createAdminClient(), username);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("SUPABASE_SERVICE_ROLE_KEY")) {
      return { ok: false, error: "El ingreso no está configurado en este servidor." };
    }
    return { ok: false, error: GENERIC_ERROR };
  }

  if ("error" in prepared) {
    return { ok: false, error: prepared.error };
  }

  if (prepared.needsPassword && prepared.signInPassword) {
    const session = await createSessionClient();
    const { error } = await session.auth.signInWithPassword({
      email: prepared.email,
      password: prepared.signInPassword,
    });
    if (error) {
      return { ok: false, error: "No se pudo iniciar el primer ingreso." };
    }
    return { ok: true, needsPassword: true };
  }

  return { ok: true, needsPassword: false };
}

export async function completeTeacherPasswordLogin(
  username: string,
  password: string,
): Promise<AuthActionResult> {
  if (!password) {
    return { ok: false, error: "Ingrese su contraseña." };
  }

  let prepared;
  try {
    prepared = await prepareTeacherLogin(createAdminClient(), username);
  } catch {
    return { ok: false, error: GENERIC_ERROR };
  }

  if ("error" in prepared) {
    return { ok: false, error: prepared.error };
  }

  if (prepared.needsPassword) {
    return { ok: false, error: "Debe crear su contraseña en el primer ingreso." };
  }

  const session = await createSessionClient();
  const { error } = await session.auth.signInWithPassword({
    email: prepared.email,
    password,
  });
  if (error) {
    return { ok: false, error: "Usuario o contraseña incorrectos." };
  }

  return { ok: true };
}

export async function setTeacherPassword(
  password: string,
  confirm: string,
): Promise<AuthActionResult> {
  if (password !== confirm) {
    return { ok: false, error: "Las contraseñas no coinciden." };
  }
  if (!meetsPasswordRequirements(password)) {
    const parsed = passwordSchema.safeParse(password);
    return {
      ok: false,
      error: parsed.error?.issues[0]?.message ?? "La contraseña no cumple los requisitos.",
    };
  }

  const session = await createSessionClient();
  const {
    data: { user },
  } = await session.auth.getUser();
  if (!user) {
    return { ok: false, error: "La sesión expiró. Ingrese de nuevo." };
  }

  const { error: updateError } = await session.auth.updateUser({ password });
  if (updateError) {
    return { ok: false, error: "No se pudo guardar la contraseña." };
  }

  const now = new Date().toISOString();
  try {
    const admin = createAdminClient();
    await admin.auth.admin.updateUserById(user.id, {
      app_metadata: {
        ...user.app_metadata,
        account_status: "active",
      },
    });
    await admin
      .from("profiles")
      .update({ account_status: "active", first_login_at: now })
      .eq("id", user.id);
    await admin
      .from("roster_accounts")
      .update({ account_status: "active" })
      .eq("auth_user_id", user.id);
  } catch {
    return { ok: false, error: "No se pudo activar la cuenta." };
  }

  return { ok: true };
}

export async function signOutTeacher() {
  const session = await createSessionClient();
  await session.auth.signOut();
  redirect("/");
}
