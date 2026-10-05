import "server-only";

import { Resend } from "resend";
import { loadWordmarkAttachment } from "@/lib/email/branding";
import { renderWeeonLetter, weeonLetterHello, WEEON_LETTER } from "@/lib/email/letter";

export type SendPasswordResetEmailInput = {
  to: string;
  resetUrl: string;
  institutionName: string;
};

export type EmailSendResult =
  | { success: true; id: string }
  | { success: false; error: string };

/**
 * Password reset for the teacher portal. Same Weeon School letter as the
 * welcome mail. Supabase Auth mail is never used.
 */
export function renderPasswordResetEmail(
  input: SendPasswordResetEmailInput,
  options?: { showLogo?: boolean },
): { subject: string; text: string; html: string } {
  const school = input.institutionName.trim() || "su institución";
  const safeSchool = escapeHtml(school);
  const footer =
    "El enlace es válido por 24 horas. Si usted no solicitó este cambio, puede ignorar este correo. Su contraseña no cambiará.";
  return {
    subject: `Restablezca su contraseña · ${school}`,
    text: [
      weeonLetterHello(),
      "",
      `Recibimos una solicitud para restablecer la contraseña de su cuenta de docente en ${school}.`,
      "",
      "Cree una contraseña nueva con este enlace:",
      "",
      input.resetUrl,
      "",
      footer,
    ].join("\n"),
    html: renderWeeonLetter({
      title: "Restablezca su contraseña",
      greeting: weeonLetterHello(),
      showLogo: options?.showLogo ?? true,
      bodyHtml: `<p style="margin:0;color:${WEEON_LETTER.inkSoft};font-size:15px;line-height:1.6;">Recibimos una solicitud para restablecer la contraseña de su cuenta de docente en <strong>${safeSchool}</strong>.</p>
        <p style="margin:14px 0 0;color:${WEEON_LETTER.inkSoft};font-size:15px;line-height:1.6;">Cree una contraseña nueva con el botón de abajo.</p>`,
      button: { label: "Restablecer contraseña", url: input.resetUrl },
      footer,
    }),
  };
}

export async function sendPasswordResetEmail(
  input: SendPasswordResetEmailInput,
): Promise<EmailSendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return {
      success: false,
      error: "RESEND_API_KEY no está configurada. No se pudo enviar el correo.",
    };
  }

  const from = process.env.RESEND_FROM ?? "Weeon School <no-responder@weeon.school>";
  const resend = new Resend(apiKey);
  let showLogo = false;
  let wordmark: { filename: string; content: Buffer; contentId: string } | null = null;
  try {
    wordmark = await loadWordmarkAttachment();
    showLogo = true;
  } catch (err) {
    console.error("[email] Weeon wordmark missing", err);
  }

  const rendered = renderPasswordResetEmail(input, { showLogo });

  try {
    const { data, error } = await resend.emails.send({
      from,
      to: [input.to.trim().toLowerCase()],
      subject: rendered.subject,
      text: rendered.text,
      html: rendered.html,
      attachments: wordmark ? [wordmark] : [],
    });

    if (error) {
      return { success: false, error: error.message };
    }
    if (!data?.id) {
      return { success: false, error: "Resend no devolvió un identificador de correo." };
    }
    return { success: true, id: data.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return { success: false, error: message };
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
