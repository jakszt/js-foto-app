import { normalizeCheckoutEmail } from "@/lib/email-normalize";

import { FOTO_GALERIA_PATH } from "@/lib/foto-routes";

/** Kanoniczny host witryny (linki w mailach, galeria). */
export function publicSiteOrigin(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (raw) {
    try {
      return new URL(raw.startsWith("http") ? raw : `https://${raw}`).origin;
    } catch {
      /* fall through */
    }
  }
  return "https://jakubsztuba.pl";
}

export function publicGalleryPageUrlForEmail(email: string): string {
  const origin = publicSiteOrigin();
  const q = encodeURIComponent(normalizeCheckoutEmail(email));
  return `${origin}${FOTO_GALERIA_PATH}?email=${q}`;
}
