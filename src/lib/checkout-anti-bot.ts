/** Minimalny czas od pokazania formularza faktury do wysłania (ms). Blokuje skryptowe POST-y „od razu”. */
export const CHECKOUT_MIN_ELAPSED_MS = 3_000;

/** Maks. wiek znacznika — wygasły / zcache’owany payload (ms). */
export const CHECKOUT_MAX_ELAPSED_MS = 1000 * 60 * 120; // 2 h

/** Odrzucenie, gdy znacznik jest zbyt w przyszłości (skew zegara / manipulacja). */
export const CHECKOUT_MAX_CLOCK_SKEW_MS = 120_000;

const GENERIC =
  "Żądanie nie mogło zostać przetworzone. Spróbuj ponownie za chwilę.";

export type AntiBotResult =
  | { ok: true }
  | { ok: false; status: 400; message: string };

/**
 * Honeypot + czas wypełniania (client `formStartedAt` vs serwer).
 * Zwraca ten sam komunikat przy każdym odrzuceniu — bez podpowiedzi dla botów.
 */
export function validateCheckoutAntiBot(body: unknown): AntiBotResult {
  if (!body || typeof body !== "object") {
    return { ok: false, status: 400, message: GENERIC };
  }

  const o = body as Record<string, unknown>;

  const venueUrl = o.venueUrl;
  if (typeof venueUrl === "string" && venueUrl.trim().length > 0) {
    return { ok: false, status: 400, message: GENERIC };
  }
  if (venueUrl != null && typeof venueUrl !== "string") {
    return { ok: false, status: 400, message: GENERIC };
  }

  const ts = o.formStartedAt;
  if (typeof ts !== "number" || !Number.isFinite(ts) || ts <= 0) {
    return { ok: false, status: 400, message: GENERIC };
  }
  if (!Number.isInteger(ts)) {
    return { ok: false, status: 400, message: GENERIC };
  }

  const now = Date.now();
  if (ts > now + CHECKOUT_MAX_CLOCK_SKEW_MS) {
    return { ok: false, status: 400, message: GENERIC };
  }

  const elapsed = now - ts;
  if (elapsed < CHECKOUT_MIN_ELAPSED_MS) {
    return { ok: false, status: 400, message: GENERIC };
  }
  if (elapsed > CHECKOUT_MAX_ELAPSED_MS) {
    return { ok: false, status: 400, message: GENERIC };
  }

  return { ok: true };
}
