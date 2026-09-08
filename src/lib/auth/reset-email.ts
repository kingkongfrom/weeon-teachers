import "server-only";

import { Resend } from "resend";

export type SendPasswordResetEmailInput = {
  to: string;
  resetUrl: string;
  institutionName: string;
};

export type EmailSendResult =
  | { success: true; id: string }
  | { success: false; error: string };

/**
 * Branded password-reset email for teachers. Delivered by Resend with our own
 * HTML body (Weeon lockup + gradient CTA) — NOT Supabase's default template,
 * so there is no Vercel logo or third-party branding. The reset token is
 * minted by the app, so we control the whole message.
 */
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

  const from = process.env.RESEND_FROM ?? "Weeon Docentes <no-responder@weeon.school>";
  const resend = new Resend(apiKey);

  try {
    const { data, error } = await resend.emails.send({
      from,
      to: [input.to.trim().toLowerCase()],
      subject: `Restablezca su contraseña · Weeon Docentes · ${input.institutionName}`,
      text: buildTextBody(input),
      html: buildHtmlBody(input),
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

function buildTextBody(input: SendPasswordResetEmailInput): string {
  return [
    "Hola:",
    "",
    `Recibimos una solicitud para restablecer la contraseña de su cuenta de docente en ${input.institutionName}.`,
    "",
    "Para crear una contraseña nueva, abra el siguiente enlace:",
    "",
    input.resetUrl,
    "",
    "El enlace es válido por 24 horas. Si no lo solicitó usted, puede ignorar este correo.",
  ].join("\n");
}

/* Brand palette for email (matches the marketing identity + teachers login):
   navy ambient band, 3-stop brand gradient CTA, teal accent, warm gray copy. */
const BRAND = {
  bg: "#f6f7fb",
  band: "linear-gradient(180deg, #232b5e 0%, #141f4d 100%)",
  bandEdge: "linear-gradient(90deg, #5e25cc 0%, #4f46e5 42%, #2b59ff 100%)",
  cta: "linear-gradient(90deg, #5e25cc 0%, #4f46e5 42%, #2b59ff 100%)",
  ink: "#1b2433",
  inkSoft: "#3a4360",
  muted: "#6b7280",
  subtle: "#9ba3b2",
  white: "#ffffff",
  teal: "#0891b2",
} as const;

function buildHtmlBody(input: SendPasswordResetEmailInput): string {
  const safeInstitution = escapeHtml(input.institutionName.trim());
  const safeUrl = escapeHtml(input.resetUrl);
  return `<!doctype html>
<html lang="es">
  <body style="margin:0;padding:0;background-color:${BRAND.bg};font-family:-apple-system,BlinkMacSystemFont,&#39;Segoe UI&#39;,Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${BRAND.bg};padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background-color:${BRAND.white};border-radius:16px;overflow:hidden;text-align:left;box-shadow:0 12px 32px rgba(16,27,69,0.08);">
            <!-- Brand header band -->
            <tr>
              <td align="center" style="height:132px;background:${BRAND.band};padding:0;">
                <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;">
                  <tr>
                    <td align="center" style="padding-top:38px;">
                      <span style="font-size:26px;font-weight:800;letter-spacing:-0.02em;color:${BRAND.white};">
                        Weeon&nbsp;<span style="font-weight:500;color:rgba(255,255,255,0.72);">Docentes</span>
                      </span>
                      <div style="width:30px;height:3px;margin:6px auto 0;border-radius:999px;background:${BRAND.bandEdge};"></div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <!-- Body -->
            <tr>
              <td style="padding:32px 32px 8px;">
                <p style="margin:0;color:${BRAND.ink};font-size:19px;font-weight:700;letter-spacing:-0.01em;">Restablezca su contraseña</p>
              </td>
            </tr>
            <tr>
              <td style="padding:4px 32px 8px;">
                <p style="margin:0;color:${BRAND.inkSoft};font-size:15px;line-height:1.6;">
                  Recibimos una solicitud para restablecer la contraseña de su cuenta de docente en
                  <strong>${safeInstitution}</strong>.
                </p>
                <p style="margin:14px 0 0;color:${BRAND.inkSoft};font-size:15px;line-height:1.6;">
                  Cree una contraseña nueva con el siguiente enlace:
                </p>
              </td>
            </tr>
            <!-- CTA -->
            <tr>
              <td align="center" style="padding:24px 32px 30px;">
                <a href="${safeUrl}" style="display:inline-block;background:${BRAND.cta};color:${BRAND.white};text-decoration:none;font-size:15px;font-weight:600;padding:13px 30px;border-radius:999px;box-shadow:0 8px 20px rgba(79,70,229,0.28);">
                  Restablecer contraseña
                </a>
              </td>
            </tr>
            <!-- Divider -->
            <tr>
              <td style="padding:0 32px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #eef0f5;">
                  <tr><td style="height:1px;line-height:1px;font-size:0;">&nbsp;</td></tr>
                </table>
              </td>
            </tr>
            <!-- Footer note -->
            <tr>
              <td style="padding:18px 32px 34px;">
                <p style="margin:0;color:${BRAND.subtle};font-size:13px;line-height:1.6;">
                  El enlace es válido por <strong>24 horas</strong>. Si usted no solicitó este cambio, puede ignorar este correo; su contraseña no cambiará.
                </p>
                <p style="margin:14px 0 0;color:${BRAND.teal};font-size:13px;line-height:1.5;">
                  Weeon Docentes · Menos administración. Más educación.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
