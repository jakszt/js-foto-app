import { NextResponse } from "next/server";
import { validateCheckoutAntiBot } from "@/lib/checkout-anti-bot";
import { persistFotoRozliczenie } from "@/lib/checkout-persistence";
import { checkoutFormSchema } from "@/lib/checkout-schema";
import { FOTO_ROZLICZENIE_DZIEKUJEMY_PATH } from "@/lib/foto-routes";
import { createInvoiceWithOnlinePayment, fetchInvoicePdfBase64 } from "@/lib/infakt";
import {
  billablePhotoCount,
  INFAKT_LINE_ITEM_NAME,
  lineNetTotalPln,
  totalGrossPln,
  unitNetPlnFromGross,
} from "@/lib/photo-checkout-pricing";
import { formatCalendarDateWarsaw, paymentDueDateWarsaw } from "@/lib/pl-warsaw-date";
import {
  buildCheckoutPaymentEmail,
  isMailjetSendConfigured,
  sendMailjetMessage,
} from "@/lib/mailjet";
import type { PostHog } from "posthog-node";

import { getOptionalPostHog } from "@/lib/posthog-server";

function absoluteTransferThankYouUrl(req: Request): string | null {
  const path = FOTO_ROZLICZENIE_DZIEKUJEMY_PATH;
  const site = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (site) {
    try {
      return new URL(path, site).href;
    } catch {
      /* continue */
    }
  }
  const vercel =
    process.env.VERCEL_URL?.trim() || process.env.NEXT_PUBLIC_VERCEL_URL?.trim();
  if (vercel) {
    const base = vercel.startsWith("http") ? vercel : `https://${vercel}`;
    try {
      return new URL(path, base).href;
    } catch {
      /* continue */
    }
  }
  const xfHost = req.headers.get("x-forwarded-host");
  const host =
    xfHost?.split(",")[0]?.trim() || req.headers.get("host")?.trim() || "";
  if (!host) return null;
  const proto =
    (req.headers.get("x-forwarded-proto") ?? "https")
      .split(",")[0]
      ?.trim() || "https";
  try {
    return new URL(path, `${proto}://${host}`).href;
  } catch {
    return null;
  }
}

async function shutdownPosthogSafely(
  client: PostHog | null,
  fn: (c: PostHog) => void
): Promise<void> {
  if (!client) return;
  try {
    fn(client);
    await client.shutdown();
  } catch (e) {
    console.error("[checkout] PostHog:", e);
  }
}

export async function POST(req: Request) {
  const apiKey = process.env.INFAKT_API_KEY;
  const baseUrl =
    process.env.INFAKT_API_BASE_URL?.trim() || "https://api.infakt.pl/v3";

  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "Brak INFAKT_API_KEY w zmiennych środowiskowych. Dodaj klucz API z inFaktu.",
      },
      { status: 500 }
    );
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Niepoprawne JSON" }, { status: 400 });
  }

  const parsed = checkoutFormSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Walidacja nieudana", issues: parsed.error.flatten() },
      { status: 422 }
    );
  }

  const anti = validateCheckoutAntiBot(json);
  if (!anti.ok) {
    return NextResponse.json({ error: anti.message }, { status: anti.status });
  }

  const photoCount = parsed.data.photoCount;
  const billable = billablePhotoCount(photoCount);
  const serviceName = INFAKT_LINE_ITEM_NAME;
  const grossTotal = totalGrossPln(photoCount);
  const lineNet = lineNetTotalPln(photoCount);
  const avgGrossPerPhoto = grossTotal / photoCount;
  const unitNetPln = unitNetPlnFromGross(avgGrossPerPhoto);

  const baseRow = { ...parsed.data };

  const transactionAt = new Date();
  const invoiceDay = formatCalendarDateWarsaw(transactionAt);
  const paymentTo = paymentDueDateWarsaw(transactionAt, 7);

  // Use the client-supplied distinct ID for event correlation; fall back to email.
  const distinctId =
    req.headers.get("X-POSTHOG-DISTINCT-ID") || parsed.data.email;
  const sessionId = req.headers.get("X-POSTHOG-SESSION-ID") || undefined;

  const posthog = getOptionalPostHog();

  try {
    const transferThankYou = absoluteTransferThankYouUrl(req);
    const {
      paymentUrl,
      invoiceUuid,
      checkoutViaTransferFallback,
    } = await createInvoiceWithOnlinePayment(
      apiKey,
      baseUrl,
      {
        fullName: parsed.data.fullName,
        email: parsed.data.email,
        street: parsed.data.street,
        postalCode: parsed.data.postalCode,
        city: parsed.data.city,
        isCompany: parsed.data.isCompany,
        nip: parsed.data.nip,
      },
      {
        name: serviceName,
        quantity: photoCount,
        unitNetPricePln: unitNetPln,
        lineNetTotalPln: lineNet,
        taxPercent: 23,
      },
      {
        invoiceDate: invoiceDay,
        sellDate: invoiceDay,
        paymentTo,
      },
      { fallbackCheckoutAbsoluteUrl: transferThankYou }
    );

    await persistFotoRozliczenie({
      ...baseRow,
      infakt_invoice_uuid: invoiceUuid ?? null,
      infakt_error: null,
    });

    await shutdownPosthogSafely(posthog, (c) => {
      c.capture({
        distinctId,
        event: "checkout_invoice_created",
        properties: {
          invoice_uuid: invoiceUuid ?? null,
          is_company: parsed.data.isCompany,
          photo_count: parsed.data.photoCount,
          billable_photo_count: billable,
          gross_total_pln: grossTotal,
          net_line_pln: lineNet,
          checkout_via_transfer_fallback: checkoutViaTransferFallback,
          ...(sessionId ? { $session_id: sessionId } : {}),
        },
      });
    });

    if (isMailjetSendConfigured()) {
      let attachments:
        | { ContentType: string; Filename: string; Base64Content: string }[]
        | undefined;
      let pdfAttached = false;
      if (invoiceUuid) {
        const pdf = await fetchInvoicePdfBase64(apiKey, baseUrl, invoiceUuid);
        if (pdf) {
          attachments = [
            {
              ContentType: "application/pdf",
              Filename: pdf.filename,
              Base64Content: pdf.base64,
            },
          ];
          pdfAttached = true;
        } else {
          console.warn("[checkout] Nie udało się pobrać PDF faktury do załącznika.");
        }
      }

      // Nie używamy `after()` — na Vercelu zadania po wysłaniu odpowiedzi często nie
      // domykają się na czas; wysyłka musi zakończyć się przed returnem JSON.
      try {
        const { subject, textPart, htmlPart } = buildCheckoutPaymentEmail({
          fullName: parsed.data.fullName,
          paymentUrl,
          photoCount: parsed.data.photoCount,
          totalGrossPln: grossTotal,
          pdfAttached,
          viaTransferOnly: checkoutViaTransferFallback,
        });
        const r = await sendMailjetMessage({
          to: [{ email: parsed.data.email, name: parsed.data.fullName }],
          subject,
          textPart,
          htmlPart,
          customId: invoiceUuid ?? undefined,
          attachments,
        });
        if (!r.ok) console.error("[checkout] Mailjet:", r.error);
      } catch (e) {
        console.error("[checkout] Mailjet pipeline:", e);
      }
    }

    return NextResponse.json({
      paymentUrl,
      invoiceUuid,
      checkoutViaTransferFallback,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Nieznany błąd";
    await persistFotoRozliczenie({
      ...baseRow,
      infakt_invoice_uuid: null,
      infakt_error: message,
    });

    await shutdownPosthogSafely(posthog, (c) => {
      c.capture({
        distinctId,
        event: "checkout_invoice_failed",
        properties: {
          error: message,
          is_company: parsed.data.isCompany,
          ...(sessionId ? { $session_id: sessionId } : {}),
        },
      });
    });

    return NextResponse.json({ error: message }, { status: 502 });
  }
}
