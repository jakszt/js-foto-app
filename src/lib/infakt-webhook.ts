import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Weryfikacja nagłówka `X-Infakt-Signature` (HMAC-SHA256 nad surowym body).
 * @see https://pomoc.infakt.pl/hc/pl/articles/15731087636370-Jak-zweryfikowa%C4%87-sygnatur%C4%99-webhooka
 */
export function verifyInfaktWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string
): boolean {
  if (!signatureHeader?.trim() || !secret) return false;
  const expectedHex = createHmac("sha256", secret)
    .update(rawBody, "utf8")
    .digest("hex");
  const received = signatureHeader.trim().toLowerCase().replace(/^sha256=/, "");
  const expected = expectedHex.toLowerCase();
  if (received.length !== expected.length || !/^[0-9a-f]+$/i.test(received)) {
    return false;
  }
  try {
    const a = Buffer.from(expected, "hex");
    const b = Buffer.from(received, "hex");
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/** UUID faktury z payloadu zdarzenia `invoice_paid`. */
export function extractInvoiceUuidFromInfaktResource(
  resource: unknown
): string | null {
  if (!resource || typeof resource !== "object") return null;
  const r = resource as Record<string, unknown>;
  if (typeof r.uuid === "string" && r.uuid.length > 0) return r.uuid;
  const inner = r.invoice;
  if (inner && typeof inner === "object") {
    const u = (inner as Record<string, unknown>).uuid;
    if (typeof u === "string" && u.length > 0) return u;
  }
  return null;
}
