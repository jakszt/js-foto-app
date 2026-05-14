import { PostHog } from "posthog-node";

/**
 * Zwraca klienta PostHoga albo `null`, gdy brak tokenu lub inicjalizacja się nie uda.
 * Nigdy nie rzuca — checkout nie może paść na analityce.
 */
export function getOptionalPostHog(): PostHog | null {
  const token = process.env.NEXT_PUBLIC_POSTHOG_TOKEN?.trim();
  if (!token) return null;
  try {
    return new PostHog(token, {
      host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
      flushAt: 1,
      flushInterval: 0,
    });
  } catch (e) {
    console.error("[posthog-server] init error", e);
    return null;
  }
}
