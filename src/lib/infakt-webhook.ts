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

/** UUID w formacie RFC (v1–v5). */
const INVOICE_UUID_RE =
  /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i;

function extractUuidFromString(s: string): string | null {
  const m = s.match(INVOICE_UUID_RE);
  return m ? m[0]!.toLowerCase() : null;
}

function deepFindInvoiceUuid(value: unknown, depth: number): string | null {
  if (depth > 12) return null;
  if (value == null) return null;
  if (typeof value === "string") {
    return extractUuidFromString(value);
  }
  if (typeof value !== "object") return null;
  const o = value as Record<string, unknown>;
  if (typeof o.uuid === "string") {
    const u = o.uuid.trim();
    if (INVOICE_UUID_RE.test(u)) return u.toLowerCase();
  }
  for (const v of Object.values(o)) {
    const found = deepFindInvoiceUuid(v, depth + 1);
    if (found) return found;
  }
  return null;
}

/** UUID faktury z payloadu zdarzenia `invoice_paid`. */
export function extractInvoiceUuidFromInfaktResource(
  resource: unknown
): string | null {
  if (!resource || typeof resource !== "object") {
    if (typeof resource === "string") {
      return extractUuidFromString(resource);
    }
    return null;
  }
  const r = resource as Record<string, unknown>;
  if (typeof r.uuid === "string" && r.uuid.length > 0) {
    return r.uuid.trim().toLowerCase();
  }
  const inner = r.invoice;
  if (inner && typeof inner === "object") {
    const u = (inner as Record<string, unknown>).uuid;
    if (typeof u === "string" && u.length > 0) {
      return u.trim().toLowerCase();
    }
  }
  const deep = deepFindInvoiceUuid(resource, 0);
  return deep;
}
