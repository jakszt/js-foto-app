import { NextResponse } from "next/server";

import {
  claimPaymentThankYouRecipient,
  clearPaymentThankYouReservation,
} from "@/lib/checkout-persistence";
import {
  extractInvoiceUuidFromInfaktResource,
  verifyInfaktWebhookSignature,
} from "@/lib/infakt-webhook";
import {
  buildThankYouAfterPaymentEmail,
  isMailjetSendConfigured,
  sendMailjetMessage,
} from "@/lib/mailjet";

/**
 * Webhook inFakt — m.in. `invoice_paid` (faktura opłacona).
 * @see https://pomoc.infakt.pl/hc/pl/articles/14603650146962-Jakie-zdarzenia-s%C4%85-obs%C5%82ugiwane-przez-webhooki
 * @see https://pomoc.infakt.pl/hc/pl/articles/14603910862226-Jak-wygl%C4%85da-payload-zdarzenia
 *
 * Aktywacja webhooka: odpowiedź musi zawierać ten sam `verification_code`.
 * Sygnatura: nagłówek `X-Infakt-Signature` (HMAC-SHA256 body) — sekret z panelu inFakt (`INFAKT_WEBHOOK_SECRET`).
 */
export async function POST(req: Request) {
  const rawBody = await req.text();

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody) as unknown;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const body = parsed as Record<string, unknown>;

  if (typeof body.verification_code === "string") {
    return NextResponse.json({ verification_code: body.verification_code });
  }

  const secret = process.env.INFAKT_WEBHOOK_SECRET?.trim();
  const sig = req.headers.get("x-infakt-signature");
  if (secret) {
    if (!verifyInfaktWebhookSignature(rawBody, sig, secret)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  } else if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "INFAKT_WEBHOOK_SECRET is not configured" },
      { status: 503 }
    );
  }

  const event = body.event;
  if (!event || typeof event !== "object") {
    return NextResponse.json({ ok: true });
  }

  const eventName = (event as Record<string, unknown>).name;
  if (eventName !== "invoice_paid") {
    return NextResponse.json({ ok: true, skipped: String(eventName) });
  }

  const invoiceUuid = extractInvoiceUuidFromInfaktResource(body.resource);
  if (!invoiceUuid) {
    console.warn("[infakt-webhook] invoice_paid without invoice uuid");
    return NextResponse.json({ ok: true });
  }

  if (!isMailjetSendConfigured()) {
    return NextResponse.json({ ok: true, skipped: "mailjet_not_configured" });
  }

  const recipient = await claimPaymentThankYouRecipient(invoiceUuid);
  if (!recipient) {
    return NextResponse.json({ ok: true, skipped: "no_checkout_row_or_already_sent" });
  }

  const { subject, textPart, htmlPart } = buildThankYouAfterPaymentEmail({
    fullName: recipient.fullName,
  });

  const send = await sendMailjetMessage({
    to: [{ email: recipient.email, name: recipient.fullName }],
    subject,
    textPart,
    htmlPart,
    customId: `paid-${invoiceUuid}`,
  });

  if (!send.ok) {
    console.error("[infakt-webhook] Mailjet:", send.error);
    await clearPaymentThankYouReservation(invoiceUuid);
    return NextResponse.json({ error: "Mail send failed" }, { status: 502 });
  }

  return NextResponse.json({ ok: true, emailed: true });
}
