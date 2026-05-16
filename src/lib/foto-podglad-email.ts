import {
  appendFooterToPlainText,
  escapeHtml,
  wrapTransactionalHtml,
} from "@/lib/mailjet-templates";

const CONTACT_PHONE_DISPLAY = "+48 509 167 828";
const CONTACT_PHONE_TEL = "+48509167828";

function greetingName(fullName: string): string {
  const first = fullName.trim().split(/\s+/)[0];
  return first && first.length > 0 ? first : fullName.trim();
}

/** Powiadomienie dla fotografa po zgłoszeniu z kafelka „Chcę zobaczyć zdjęcia!”. */
export const FOTO_PODGLAD_OWNER_EMAIL = "jakub.sztuba@gmail.com" as const;

export function buildFotoPodgladNotifyEmail(opts: {
  fullName: string;
  email: string;
  dogName: string;
  photoFilename: string;
}): { subject: string; textPart: string; htmlPart: string } {
  const subject = `Nowe zgłoszenie — Chcę zobaczyć zdjęcia! (${opts.fullName})`;
  const textPart = `Nowe zgłoszenie z kafelka „Chcę zobaczyć zdjęcia!” (/foto)

Ktoś chce obejrzeć zdjęcia z Latających Psów w Poznaniu.

Imię i nazwisko: ${opts.fullName}
E-mail: ${opts.email}
Imię psa z zawodów: ${opts.dogName}
Zdjęcie psa: załącznik (${opts.photoFilename})`;

  const safeEmail = escapeHtml(opts.email);

  const htmlPart = wrapTransactionalHtml(
    `
    <p style="margin:0 0 10px 0;font-size:12px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:#8a857c;">Nowe zgłoszenie</p>
    <p style="margin:0 0 16px;font-size:17px;line-height:1.45;color:#3d342c;">
      Kafelek <strong>„Chcę zobaczyć zdjęcia!”</strong> — ktoś chce obejrzeć zdjęcia
      <span style="color:#6b5f54;">(Latające Psy, Poznań)</span>
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;font-size:15px;line-height:1.5;color:#3d342c;">
      <tr><td style="padding:6px 0;color:#6b5f54;width:42%;">Imię i nazwisko</td><td style="padding:6px 0;"><strong>${escapeHtml(opts.fullName)}</strong></td></tr>
      <tr><td style="padding:6px 0;color:#6b5f54;">E-mail</td><td style="padding:6px 0;"><a href="mailto:${safeEmail}" style="color:#d97757;text-decoration:none;">${safeEmail}</a></td></tr>
      <tr><td style="padding:6px 0;color:#6b5f54;">Imię psa z zawodów</td><td style="padding:6px 0;"><strong>${escapeHtml(opts.dogName)}</strong></td></tr>
      <tr><td style="padding:6px 0;color:#6b5f54;">Zdjęcie psa</td><td style="padding:6px 0;">załącznik — ${escapeHtml(opts.photoFilename)}</td></tr>
    </table>
  `,
    { preheader: `${opts.fullName} — ${opts.dogName}, zdjęcie w załączniku.` }
  );

  return { subject, textPart, htmlPart };
}

export function buildFotoPodgladConfirmationEmail(opts: {
  fullName: string;
}): { subject: string; textPart: string; htmlPart: string } {
  const name = greetingName(opts.fullName);
  const safeName = escapeHtml(name);
  const subject = "Otrzymałem Twoje zgłoszenie — podgląd zdjęć";

  const textBody = `Cześć ${name},

Otrzymałem Twoje zgłoszenie, odezwę się niebawem z podglądem zdjęć! W kontakcie!

Jeśli masz pytania, zadzwoń lub napisz na ${CONTACT_PHONE_DISPLAY}.

Pozdrowienia,
Jakub`;

  const textPart = appendFooterToPlainText(textBody);

  const innerHtml = `
              <p style="margin:0 0 14px 0;">Cześć <strong>${safeName}</strong>,</p>
              <p style="margin:0 0 18px 0;line-height:1.6;">Otrzymałem Twoje zgłoszenie, odezwę się niebawem z podglądem zdjęć! W kontakcie!</p>
              <p style="margin:0 0 18px 0;line-height:1.6;">Jeśli masz pytania, zadzwoń lub napisz na <a href="tel:${CONTACT_PHONE_TEL}" style="color:#d97757;font-weight:500;text-decoration:none;">${CONTACT_PHONE_DISPLAY}</a>.</p>
              <p style="margin:16px 0 0 0;font-size:14px;color:#37352f;">Pozdrowienia,<br/>Jakub</p>`;

  const htmlPart = wrapTransactionalHtml(innerHtml, {
    preheader: "Odezwę się niebawem z podglądem zdjęć.",
  });

  return { subject, textPart, htmlPart };
}
