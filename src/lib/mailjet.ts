import {
  appendFooterToPlainText,
  escapeHtml,
  wrapTransactionalHtml,
} from "@/lib/mailjet-templates";

const MAILJET_SEND_URL = "https://api.mailjet.com/v3.1/send";

export type MailjetRecipient = { email: string; name?: string };

export type MailjetAttachment = {
  ContentType: string;
  Filename: string;
  Base64Content: string;
};

export type SendMailjetMessageParams = {
  to: MailjetRecipient[];
  subject: string;
  textPart: string;
  htmlPart: string;
  /** Korelacja z [Event API](https://dev.mailjet.com/email/guides/#event-api-real-time-notifications) */
  customId?: string;
  attachments?: MailjetAttachment[];
};

export function isMailjetSendConfigured(): boolean {
  return Boolean(
    process.env.MAILJET_API_KEY?.trim() &&
      process.env.MAILJET_API_SECRET?.trim() &&
      process.env.MAILJET_FROM_EMAIL?.trim()
  );
}

/**
 * Wysyłka transakcyjna przez [Send API v3.1](https://dev.mailjet.com/email/guides/#send-api-v31).
 */
export async function sendMailjetMessage(
  params: SendMailjetMessageParams
): Promise<{ ok: true } | { ok: false; error: string }> {
  const apiKey = process.env.MAILJET_API_KEY?.trim();
  const secret = process.env.MAILJET_API_SECRET?.trim();
  const fromEmail = process.env.MAILJET_FROM_EMAIL?.trim();
  const fromName =
    process.env.MAILJET_FROM_NAME?.trim() || "Jakub Sztuba";

  if (!apiKey || !secret || !fromEmail) {
    return { ok: false, error: "Brak konfiguracji Mailjet (klucze / nadawca)." };
  }

  const message: Record<string, unknown> = {
    From: { Email: fromEmail, Name: fromName },
    To: params.to.map((t) => ({
      Email: t.email,
      Name: (t.name ?? t.email).slice(0, 255),
    })),
    Subject: params.subject,
    TextPart: params.textPart,
    HTMLPart: params.htmlPart,
  };

  if (params.customId) {
    message.CustomID = params.customId.slice(0, 255);
  }

  if (params.attachments?.length) {
    message.Attachments = params.attachments.map((a) => ({
      ContentType: a.ContentType,
      Filename: a.Filename,
      Base64Content: a.Base64Content,
    }));
  }

  const auth = Buffer.from(`${apiKey}:${secret}`, "utf8").toString("base64");

  const res = await fetch(MAILJET_SEND_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${auth}`,
    },
    body: JSON.stringify({ Messages: [message] }),
  });

  if (!res.ok) {
    const body = await res.text();
    return {
      ok: false,
      error: `Mailjet HTTP ${res.status}: ${body.slice(0, 500)}`,
    };
  }

  return { ok: true };
}

export function buildCheckoutPaymentEmail(opts: {
  fullName: string;
  paymentUrl: string;
  photoCount: number;
  totalGrossPln: number;
  pdfAttached: boolean;
}): { subject: string; textPart: string; htmlPart: string } {
  const subject = "Link do płatności za zdjęcia";
  const totalFmt = formatPlnMoney(opts.totalGrossPln);
  const zdj = zdjecieWord(opts.photoCount);
  const safeName = escapeHtml(opts.fullName);
  const safeUrl = escapeHtml(opts.paymentUrl);
  const safeTotal = escapeHtml(totalFmt);

  const pdfNote = opts.pdfAttached
    ? "\n\nW załączeniu przesyłamy fakturę w formacie PDF."
    : "";

  const textBody = `Cześć ${opts.fullName},

dziękujemy — przygotowaliśmy fakturę i płatność online.

Zamówienie: ${opts.photoCount} ${zdj} × 40 zł brutto = ${totalFmt}

Otwórz bezpieczny link do opłacenia:
${opts.paymentUrl}
${pdfNote}

Jeśli to nie Ty wypełniałeś formularz, zignoruj tę wiadomość.

— Jakub`;

  const textPart = appendFooterToPlainText(textBody);

  const pdfHtml = opts.pdfAttached
    ? `<p style="margin:20px 0 0 0;font-size:13px;line-height:1.5;color:#6f6a62;">Fakturę w PDF dołączyliśmy do tej wiadomości.</p>`
    : "";

  const innerHtml = `
              <p style="margin:0 0 14px 0;">Cześć <strong>${safeName}</strong>,</p>
              <p style="margin:0 0 18px 0;">Dziękujemy — przygotowaliśmy fakturę i płatność online.</p>
              <p style="margin:0 0 22px 0;"><strong>${opts.photoCount}</strong> × 40 zł brutto = <strong style="color:#37352f;">${safeTotal}</strong></p>
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 8px 0;">
                <tr>
                  <td style="border-radius:10px;background:#d97757;">
                    <a href="${safeUrl}" style="display:inline-block;padding:14px 22px;font-size:14px;font-weight:600;color:#fffdf9;text-decoration:none;">Przejdź do płatności</a>
                  </td>
                </tr>
              </table>
              ${pdfHtml}
              <p style="margin:22px 0 0 0;font-size:13px;line-height:1.5;color:#8a857c;">Jeśli to nie Ty wypełniałeś formularz, zignoruj tę wiadomość.</p>
              <p style="margin:16px 0 0 0;font-size:14px;color:#37352f;">— Jakub</p>`;

  const htmlPart = wrapTransactionalHtml(innerHtml, {
    preheader: `Płatność online — ${totalFmt}, ${opts.photoCount} ${zdj}.`,
  });

  return { subject, textPart, htmlPart };
}

export function buildThankYouAfterPaymentEmail(opts: {
  fullName: string;
}): { subject: string; textPart: string; htmlPart: string } {
  const subject = "Dziękuję za opłacenie zdjęć!";
  const safeName = escapeHtml(opts.fullName);

  const textBody = `Cześć ${opts.fullName},

Dziękuję — Twoja płatność za sesję zdjęciową została zaksięgowana.

Jeśli masz pytania, po prostu odpisz na tego maila.

Pozdrawiam,
Jakub`;

  const textPart = appendFooterToPlainText(textBody);

  const innerHtml = `
              <p style="margin:0 0 14px 0;">Cześć <strong>${safeName}</strong>,</p>
              <p style="margin:0 0 18px 0;">Dziękuję — Twoja płatność za sesję zdjęciową została zaksięgowana.</p>
              <p style="margin:0 0 22px 0;font-size:14px;line-height:1.55;color:#6f6a62;">Jeśli masz pytania, po prostu odpisz na tego maila.</p>
              <p style="margin:0;font-size:14px;color:#37352f;">Pozdrawiam,<br/><span style="margin-top:6px;display:inline-block;">Jakub</span></p>`;

  const htmlPart = wrapTransactionalHtml(innerHtml, {
    preheader: "Dziękuję za opłacenie zdjęć.",
  });

  return { subject, textPart, htmlPart };
}

function zdjecieWord(n: number): string {
  if (n === 1) return "zdjęcie";
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "zdjęcia";
  return "zdjęć";
}

function formatPlnMoney(amount: number): string {
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
