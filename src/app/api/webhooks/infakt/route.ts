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
  buildPostPaymentGalleryEmail,
  isMailjetSendConfigured,
  sendMailjetMessage,
} from "@/lib/mailjet";
import { publicGalleryPageUrlForEmail } from "@/lib/site-public-url";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

/**
 * Webhook inFakt — m.in. `invoice_paid` (faktura opłacona).
 * @see https://pomoc.infakt.pl/hc/pl/articles/14603650146962-Jakie-zdarzenia-s%C4%85-obs%C5%82ugiwane-przez-webhooki
 * @see https://pomoc.infakt.pl/hc/pl/articles/14603910862226-Jak-wygl%C4%85da-payload-zdarzenia
 *
 * Aktywacja webhooka: odpowiedź musi zawierać ten sam `verification_code`.
 * Sygnatura: nagłówek `X-Infakt-Signature` (HMAC-SHA256 body) — sekret z panelu inFakt (`INFAKT_WEBHOOK_SECRET`).
 */

/** GET — szybka diagnostyka na Vercelu (bez sekretów w odpowiedzi). */
export async function GET() {
  const supabase = createSupabaseAdmin();
  return NextResponse.json({
    ok: true,
    checks: {
      node_env: process.env.NODE_ENV ?? null,
      infakt_webhook_secret_configured: Boolean(
        process.env.INFAKT_WEBHOOK_SECRET?.trim()
      ),
      mailjet_ready: isMailjetSendConfigured(),
      mailjet_env: {
        MAILJET_API_KEY: Boolean(process.env.MAILJET_API_KEY?.trim()),
        MAILJET_API_SECRET: Boolean(process.env.MAILJET_API_SECRET?.trim()),
        MAILJET_FROM_EMAIL: Boolean(process.env.MAILJET_FROM_EMAIL?.trim()),
      },
      supabase_admin_client: Boolean(supabase),
      supabase_url: Boolean(
        process.env.SUPABASE_URL?.trim() ||
          process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
      ),
      supabase_service_role: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()),
    },
    hints: [
      "Na Vercelu: Environment = Production — te same zmienne co lokalnie (.env.local nie trafia na deploy).",
      "URL webhooka w inFakcie: https://<twoja-domena-produkcyjna>/api/webhooks/infakt (nie preview, jeśli testujesz produkcyjną bazę).",
      "Gdy infakt_webhook_secret_configured = false i NODE_ENV=production, każdy POST (poza verification) zwraca 503 — inFakt nie wyśle maila.",
      "Gdy skipped=no_checkout_row_or_already_sent — brak wiersza w foto_rozliczenia z tym UUID albo mail już wysłany (payment_thank_you_sent_at).",
    ],
  });
}

export async function POST(req: Request) {
  const rawBody = await req.text();

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody) as unknown;
  } catch {
    console.warn("[infakt-webhook] invalid JSON");
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const body = parsed as Record<string, unknown>;

  if (typeof body.verification_code === "string") {
    console.info("[infakt-webhook] verification handshake");
    return NextResponse.json({ verification_code: body.verification_code });
  }

  const secret = process.env.INFAKT_WEBHOOK_SECRET?.trim();
  const sig = req.headers.get("x-infakt-signature");
  if (secret) {
    if (!verifyInfaktWebhookSignature(rawBody, sig, secret)) {
      console.warn("[infakt-webhook] invalid signature (sprawdź INFAKT_WEBHOOK_SECRET na Vercelu vs panel inFakt)");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  } else if (process.env.NODE_ENV === "production") {
    console.error(
      "[infakt-webhook] INFAKT_WEBHOOK_SECRET missing on production — odrzucono żądanie (503)"
    );
    return NextResponse.json(
      {
        error: "INFAKT_WEBHOOK_SECRET is not configured",
        hint: "Dodaj zmienną w Vercel → Project → Settings → Environment Variables (Production).",
      },
      { status: 503 }
    );
  }

  const event = body.event;
  if (!event || typeof event !== "object") {
    console.info("[infakt-webhook] no event object — ok");
    return NextResponse.json({ ok: true });
  }

  const eventName = (event as Record<string, unknown>).name;
  if (eventName !== "invoice_paid") {
    console.info("[infakt-webhook] skipped event:", String(eventName));
    return NextResponse.json({ ok: true, skipped: String(eventName) });
  }

  const invoiceUuid = extractInvoiceUuidFromInfaktResource(body.resource);
  if (!invoiceUuid) {
    const rk =
      body.resource && typeof body.resource === "object"
        ? Object.keys(body.resource as object)
        : [];
    console.warn(
      "[infakt-webhook] invoice_paid: nie znaleziono UUID faktury w resource (klucze resource):",
      rk
    );
    return NextResponse.json({
      ok: true,
      skipped: "no_invoice_uuid_in_payload",
      resource_keys: rk,
      hint: "W ustawieniach webhooka inFakt włącz pełne dane zasobu (bez trybu „bez poufnych danych”, jeśli odcina UUID).",
    });
  }

  if (!isMailjetSendConfigured()) {
    console.error("[infakt-webhook] Mailjet nie jest skonfigurowany (sprawdź zmienne na Production)");
    return NextResponse.json({ ok: true, skipped: "mailjet_not_configured" });
  }

  const recipient = await claimPaymentThankYouRecipient(invoiceUuid);
  if (!recipient) {
    console.warn(
      "[infakt-webhook] claim failed — brak wiersza foto_rozliczenia dla UUID lub mail już wysłany:",
      invoiceUuid
    );
    return NextResponse.json({
      ok: true,
      skipped: "no_checkout_row_or_already_sent",
      invoice_uuid: invoiceUuid,
      hint: "Checkout musi zapisać infakt_invoice_uuid w Supabase; sprawdź czy na produkcji działa zapis rozliczenia.",
    });
  }

  const galleryUrl = publicGalleryPageUrlForEmail(recipient.email);
  const { subject, textPart, htmlPart } = buildPostPaymentGalleryEmail({
    fullName: recipient.fullName,
    email: recipient.email,
    galleryUrl,
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
    return NextResponse.json(
      {
        error: "Mail send failed",
        detail: send.error,
        invoice_uuid: invoiceUuid,
      },
      { status: 502 }
    );
  }

  console.info(
    "[infakt-webhook] gallery email sent to",
    recipient.email,
    "invoice",
    invoiceUuid
  );
  return NextResponse.json({ ok: true, emailed: true, invoice_uuid: invoiceUuid });
}
