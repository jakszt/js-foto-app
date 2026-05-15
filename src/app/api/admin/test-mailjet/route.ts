import { NextResponse } from "next/server";

import {
  buildCheckoutPaymentEmail,
  isMailjetSendConfigured,
  sendMailjetMessage,
} from "@/lib/mailjet";

/**
 * Test wysyłki Mailjet (szablon jak po checkoutcie).
 * Ustaw `MAILJET_TEST_SECRET` w `.env.local`, potem:
 *
 * `curl -X POST http://localhost:3000/api/admin/test-mailjet -H "x-mailjet-test-secret: TWÓJ_SEKRET" -H "Content-Type: application/json" -d "{\"to\":\"jakub.sztuba@gmail.com\"}"`
 */
export async function POST(req: Request) {
  const secret = process.env.MAILJET_TEST_SECRET?.trim();
  if (!secret) {
    return NextResponse.json(
      {
        error:
          "Brak MAILJET_TEST_SECRET — dodaj do .env.local, żeby włączyć ten endpoint.",
      },
      { status: 403 }
    );
  }
  if (req.headers.get("x-mailjet-test-secret") !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isMailjetSendConfigured()) {
    return NextResponse.json(
      {
        error:
          "Mailjet nie jest skonfigurowany (MAILJET_API_KEY, MAILJET_API_SECRET, MAILJET_FROM_EMAIL).",
      },
      { status: 503 }
    );
  }

  let to = "jakub.sztuba@gmail.com";
  try {
    const body = (await req.json()) as unknown;
    if (body && typeof body === "object") {
      const t = (body as { to?: unknown }).to;
      if (typeof t === "string" && t.trim().includes("@")) to = t.trim();
    }
  } catch {
    // pusty body — domyślny adres
  }

  const { subject, textPart, htmlPart } = buildCheckoutPaymentEmail({
    fullName: "Test — Mailjet",
    paymentUrl: "https://example.com/platnosc-test",
    photoCount: 4,
    totalGrossPln: 90,
    pdfAttached: false,
  });

  const send = await sendMailjetMessage({
    to: [{ email: to, name: "Test" }],
    subject: `[TEST] ${subject}`,
    textPart,
    htmlPart,
  });

  if (!send.ok) {
    return NextResponse.json({ ok: false, error: send.error }, { status: 502 });
  }
  return NextResponse.json({ ok: true, to });
}
