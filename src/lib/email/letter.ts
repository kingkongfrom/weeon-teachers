/** Shared Weeon School letter. Keep in step with weeon-tenants/lib/email/letter.ts. */

export const WEEON_LETTER_WORDMARK_CID = "weeon-wordmark";

export const WEEON_LETTER = {
  bg: "#f6f7fb",
  band: "linear-gradient(180deg, #232b5e 0%, #141f4d 100%)",
  bandSolid: "#1a2454",
  cta: "linear-gradient(90deg, #5e25cc 0%, #4f46e5 42%, #2b59ff 100%)",
  ink: "#1b2433",
  inkSoft: "#3a4360",
  subtle: "#9ba3b2",
  white: "#ffffff",
} as const;

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function weeonLetterHello(name?: string | null, lang: "es" | "en" = "es"): string {
  const first = name?.trim().split(/\s+/)[0] ?? "";
  const given = first.length >= 2 ? first : "";
  if (lang === "en") return given ? `Hello, ${given}.` : "Hello.";
  return given ? `Hola, ${given}.` : "Hola.";
}

export function renderWeeonLetter(input: {
  lang?: "es" | "en";
  title: string;
  greeting?: string;
  bodyHtml: string;
  button?: { label: string; url: string } | null;
  afterButtonHtml?: string;
  footer: string;
  showLogo?: boolean;
}): string {
  const lang = input.lang ?? "es";
  const title = escapeHtml(input.title);
  const greeting = input.greeting ? escapeHtml(input.greeting) : "";
  const footer = escapeHtml(input.footer);
  const showLogo = input.showLogo ?? true;
  const logo = showLogo
    ? `<img src="cid:${WEEON_LETTER_WORDMARK_CID}" alt="Weeon School" width="220" height="36" style="display:block;margin:0 auto;border:0;width:220px;height:auto;" />`
    : "";
  const button = input.button
    ? `<tr>
              <td align="center" style="padding:20px 32px 8px;">
                <a href="${escapeHtml(input.button.url)}" style="display:inline-block;background:${WEEON_LETTER.cta};color:${WEEON_LETTER.white};text-decoration:none;font-size:15px;font-weight:600;padding:13px 30px;border-radius:999px;">${escapeHtml(input.button.label)}</a>
              </td>
            </tr>`
    : "";
  const greetingHtml = greeting
    ? `<p style="margin:8px 0 0;color:${WEEON_LETTER.ink};font-size:16px;line-height:1.5;">${greeting}</p>`
    : "";

  return `<!doctype html>
<html lang="${lang}">
  <body style="margin:0;padding:0;background-color:${WEEON_LETTER.bg};font-family:-apple-system,BlinkMacSystemFont,&#39;Segoe UI&#39;,Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${WEEON_LETTER.bg};padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background-color:${WEEON_LETTER.white};border-radius:16px;overflow:hidden;text-align:left;">
            <tr>
              <td align="center" bgcolor="${WEEON_LETTER.bandSolid}" style="background:${WEEON_LETTER.band};padding:26px 24px 22px;">
                ${logo}
              </td>
            </tr>
            <tr>
              <td style="padding:32px 32px 8px;">
                <p style="margin:0;color:${WEEON_LETTER.ink};font-size:19px;font-weight:700;letter-spacing:-0.01em;">${title}</p>
                ${greetingHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:4px 32px 8px;">
                ${input.bodyHtml}
              </td>
            </tr>
            ${button}
            ${input.afterButtonHtml ?? ""}
            <tr>
              <td style="padding:18px 32px 34px;">
                <p style="margin:0;color:${WEEON_LETTER.subtle};font-size:13px;line-height:1.6;">${footer}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
