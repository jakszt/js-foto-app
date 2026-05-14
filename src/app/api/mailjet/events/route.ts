import { NextResponse } from "next/server";

/**
 * Odbiornik [Event API](https://dev.mailjet.com/email/guides/#event-api-real-time-notifications):
 * Mailjet wysyła POST z tablicą zdarzeń (sent, open, bounce, …).
 *
 * Zabezpieczenie: ustaw w panelu Mailjet URL z query `?token=…` równym `MAILJET_WEBHOOK_SECRET`.
 * Zwracaj szybko 200 — Mailjet ponawia przy innym kodzie (np. co 30 s, do 24 h).
 */
export async function POST(req: Request) {
  const expected = process.env.MAILJET_WEBHOOK_SECRET?.trim();
  if (expected) {
    const token = new URL(req.url).searchParams.get("token");
    if (token !== expected) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  } else if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "MAILJET_WEBHOOK_SECRET is not set" },
      { status: 503 }
    );
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!Array.isArray(payload)) {
    return NextResponse.json({ error: "Expected JSON array" }, { status: 400 });
  }

  for (const item of payload) {
    if (item && typeof item === "object" && "event" in item) {
      const ev = item as { event?: string; email?: string; CustomID?: string };
      console.info("[mailjet:event]", {
        event: ev.event,
        email: ev.email,
        customId: ev.CustomID,
      });
    }
  }

  return NextResponse.json({ ok: true, count: payload.length });
}
