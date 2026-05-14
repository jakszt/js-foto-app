/** Mała stopka kontaktowa (HTML + plain text). */
export const EMAIL_CONTACT_FOOTER_TEXT = `Masz pytania? Chętnie pomogę :)
+48 509 167 828
jakub.sztuba@gmail.com`;

const CONTACT_EMAIL = "jakub.sztuba@gmail.com";
const CONTACT_PHONE_DISPLAY = "+48 509 167 828";
const CONTACT_PHONE_TEL = "+48509167828";

/** Stopka prawna — treść tekstowa (dopisywana do text/plain). */
export const EMAIL_FOOTER_TEXT = `—
LOCALGROWTH Sp. z o.o.
KRS 0000966086
NIP 5223223277
REGON 521762821
Adres siedziby: Szczęsna 26, 02-454 Warszawa, Polska`;

const FOOTER_ROWS = [
  "LOCALGROWTH Sp. z o.o.",
  "KRS 0000966086",
  "NIP 5223223277",
  "REGON 521762821",
  "Adres siedziby: Szczęsna 26, 02-454 Warszawa, Polska",
] as const;

/**
 * Minimalistyczny layout transakcyjny (jasne tło, akcent, czytelna typografia).
 * `innerHtml` — fragment treści (bez pełnego dokumentu).
 */
export function wrapTransactionalHtml(
  innerHtml: string,
  opts?: { preheader?: string }
): string {
  const pre = opts?.preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${escapeAttr(
        opts.preheader
      )}</div>`
    : "";

  const footerHtml = FOOTER_ROWS.map(
    (row) =>
      `<p style="margin:0 0 6px 0;font-size:12px;line-height:1.45;color:#8a857c;">${escapeHtml(
        row
      )}</p>`
  ).join("");

  const contactFooterHtml = `
              <div style="margin-top:22px;padding-top:20px;border-top:1px solid #efece6;">
                <p style="margin:0 0 10px 0;font-size:13px;line-height:1.5;color:#6f6a62;">Masz pytania? Chętnie pomogę :)</p>
                <p style="margin:0 0 6px 0;font-size:14px;line-height:1.5;">
                  <a href="tel:${escapeAttr(CONTACT_PHONE_TEL)}" style="color:#d97757;font-weight:500;text-decoration:none;">${escapeHtml(
                    CONTACT_PHONE_DISPLAY
                  )}</a>
                </p>
                <p style="margin:0;font-size:14px;line-height:1.5;">
                  <a href="mailto:${escapeAttr(CONTACT_EMAIL)}" style="color:#d97757;font-weight:500;text-decoration:none;">${escapeHtml(
                    CONTACT_EMAIL
                  )}</a>
                </p>
              </div>`;

  return `<!DOCTYPE html>
<html lang="pl">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="color-scheme" content="light only" />
<title></title>
</head>
<body style="margin:0;padding:0;background:#f0efeb;">
${pre}
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f0efeb;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:#fdfcf9;border-radius:14px;border:1px solid #e8e6e0;box-shadow:0 1px 0 rgba(55,53,47,0.06);overflow:hidden;">
          <tr>
            <td style="height:4px;background:#d97757;line-height:4px;font-size:0;">&nbsp;</td>
          </tr>
          <tr>
            <td style="padding:28px 28px 8px 28px;font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;">
              <div style="font-size:15px;line-height:1.65;color:#37352f;">
${innerHtml}
              </div>
              ${contactFooterHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:8px 28px 24px 28px;font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;border-top:1px solid #efece6;">
              <div style="padding-top:20px;margin-top:4px;">
                <p style="margin:0 0 10px 0;font-size:10px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:#c4bfb6;">Administrator danych</p>
                ${footerHtml}
              </div>
            </td>
          </tr>
        </table>
        <p style="margin:20px 0 0 0;font-size:11px;color:#b0aba3;font-family:ui-sans-serif,system-ui,sans-serif;">Nie odpowiadaj na tę wiadomość, jeśli nie dotyczy Cię ta transakcja.</p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function appendFooterToPlainText(body: string): string {
  return `${body.trim()}\n\n${EMAIL_CONTACT_FOOTER_TEXT}\n\n${EMAIL_FOOTER_TEXT}`;
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(s: string): string {
  return escapeHtml(s).replace(/'/g, "&#39;");
}
