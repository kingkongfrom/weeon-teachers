"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createSessionClient } from "@/lib/supabase/session";
import { passwordSchema } from "@/lib/auth/password";
import {
  applyPasswordReset,
  mintPasswordReset,
  resetAdminClient,
  consumeResettableToken,
} from "@/lib/auth/password-reset";

export type PasswordResetFormState = { ok?: boolean; error?: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Sends the branded reset email for a teacher.
 *
 * Enumeration-safe: always answers like the email was sent; only real
 * teacher/admin accounts trigger an actual email (looked up via the service
 * role, matching the login username/email resolution).
 */
export async function requestPasswordResetTeacher(
  _prev: PasswordResetFormState,
  formData: FormData,
): Promise<PasswordResetFormState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!EMAIL_RE.test(email)) {
    return { error: "Ingrese un correo válido." };
  }

  const client = resetAdminClient();
  const origin = await currentOrigin();

  const result = await mintPasswordReset(client, email, origin);
  if (!result.success) {
    return {
      error:
        result.error === "reset.mintFailed"
          ? "No se pudo iniciar el restablecimiento. Intente de nuevo."
          : "No se pudo enviar el correo. Intente de nuevo.",
    };
  }
  return { ok: true };
}

/** Validates a reset token exists and is still usable (for the /reset page). */
export async function validateResetToken(
  token: string,
): Promise<{ ok: true; email?: string } | { ok: false; error?: string }> {
  const row = await consumeResettableToken(resetAdminClient(), token);
  if (!row) {
    return { ok: false, error: "El enlace no es válido o ya no está vigente." };
  }
  return { ok: true, email: row.email };
}

/**
 * Completes the reset from the hidden `token` + a new password, then signs the
 * teacher in and goes straight to the grupos.
 */
export async function completePasswordResetTeacher(
  _prev: PasswordResetFormState,
  formData: FormData,
): Promise<PasswordResetFormState> {
  const password = String(formData.get("password") ?? "");
  const token = String(formData.get("token") ?? "");

  const parsed = passwordSchema.safeParse(password);
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "La contraseña no cumple los requisitos.",
    };
  }
  if (!token) {
    return { error: "El enlace no es válido o ya no está vigente." };
  }

  const applied = await applyPasswordReset(resetAdminClient(), token, password);
  if (!applied.ok) {
    return {
      error:
        applied.code === "reset.updateFailed"
          ? "No se pudo guardar la contraseña. Intente de nuevo."
          : "El enlace no es válido o ya no está vigente.",
    };
  }

  // Sign in with the fresh password and land directly on the dashboard.
  const supabase = await createSessionClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: applied.email,
    password,
  });
  if (signInError) {
    redirect("/?reset=done");
  }

  redirect("/grupos");
}

async function currentOrigin(): Promise<string | null> {
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? h.get("x-forwarded-scheme") ?? "http";
  const host = h.get("x-forwarded-host") ?? h.get("host");
  return host ? `${proto}://${host}` : null;
}
