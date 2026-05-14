const MAILJET_SEND_URL = "https://api.mailjet.com/v3.1/send";

export type MailjetRecipient = { email: string; name?: string };

export type SendMailjetMessageParams = {
  to: MailjetRecipient[];
  subject: string;
  textPart: string;
  htmlPart: string;
  /** Korelacja z [Event API](https://dev.mailjet.com/email/guides/#event-api-real-time-notifications) */
  customId?: string;
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
 * Uwierzytelnianie: Basic (API Key : Secret Key).
 */
export async function sendMailjetMessage(
  params: SendMailjetMessageParams
): Promise<{ ok: true } | { ok: false; error: string }> {
  const apiKey = process.env.MAILJET_API_KEY?.trim();
  const secret = process.env.MAILJET_API_SECRET?.trim();
  const fromEmail = process.env.MAILJET_FROM_EMAIL?.trim();
  const fromName =
    process.env.MAILJET_FROM_NAME?.trim() || "Jakub Sztuba — foto";

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
}): { subject: string; textPart: string; htmlPart: string } {
  const subject = "Link do płatności za zdjęcia (inFakt)";
  const totalFmt = formatPlnMoney(opts.totalGrossPln);
  const zdj = zdjecieWord(opts.photoCount);
  const textPart = `Cześć ${opts.fullName},

dziękujemy — przygotowaliśmy fakturę i płatność online.

Zamówienie: ${opts.photoCount} ${zdj} × 40 zł brutto = ${totalFmt}

Otwórz bezpieczny link do opłacenia:
${opts.paymentUrl}

Jeśli to nie Ty wypełniałeś formularz, zignoruj tę wiadomość.

— Jakub`;

  const safeName = escapeHtml(opts.fullName);
  const safeUrl = escapeHtml(opts.paymentUrl);
  const safeTotal = escapeHtml(totalFmt);

  const htmlPart = `<!DOCTYPE html>
<html lang="pl">
<head><meta charset="utf-8" /></head>
<body style="font-family:system-ui,sans-serif;line-height:1.5;color:#37352f;background:#f7f6f3;padding:24px;">
  <p>Cześć <strong>${safeName}</strong>,</p>
  <p>dziękujemy — przygotowaliśmy fakturę i płatność online.</p>
  <p><strong>${opts.photoCount}</strong> × 40 zł brutto = <strong>${safeTotal}</strong></p>
  <p><a href="${safeUrl}" style="color:#d97757;font-weight:600;">Przejdź do płatności</a></p>
  <p style="font-size:14px;color:#6f6a62;">Jeśli to nie Ty wypełniałeś formularz, zignoruj tę wiadomość.</p>
  <p style="font-size:14px;">— Jakub</p>
</body>
</html>`;

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

export function buildThankYouAfterPaymentEmail(opts: {
  fullName: string;
}): { subject: string; textPart: string; htmlPart: string } {
  const subject = "Dziękujemy za opłacenie zdjęć";
  const textPart = `Cześć ${opts.fullName},

dziękujemy — zaksięgowaliśmy płatność za sesję zdjęciową.

Jeśli masz pytania, po prostu odpisz na tego maila.

Pozdrawiam,
Jakub`;

  const safeName = escapeHtml(opts.fullName);

  const htmlPart = `<!DOCTYPE html>
<html lang="pl">
<head><meta charset="utf-8" /></head>
<body style="font-family:system-ui,sans-serif;line-height:1.5;color:#37352f;background:#f7f6f3;padding:24px;">
  <p>Cześć <strong>${safeName}</strong>,</p>
  <p>dziękujemy — zaksięgowaliśmy płatność za sesję zdjęciową.</p>
  <p style="font-size:14px;color:#6f6a62;">Jeśli masz pytania, po prostu odpisz na tego maila.</p>
  <p style="font-size:14px;">Pozdrawiam,<br/>Jakub</p>
</body>
</html>`;

  return { subject, textPart, htmlPart };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
