/** Trasy sekcji /foto — osobne URL pod przycisk „wstecz” w przeglądarce. */
export const FOTO_PATH = "/foto" as const;
export const FOTO_ROZLICZENIE_PATH = "/foto/rozliczenie" as const;
export const FOTO_UMOW_SIE_PATH = "/foto/umow-sie" as const;

export type CheckoutRouteStep = "tiles" | "booking" | "billing";

export function checkoutStepFromPathname(
  pathname: string | null
): CheckoutRouteStep {
  if (!pathname) return "tiles";
  const p = pathname.replace(/\/$/, "") || "/";
  if (p === FOTO_ROZLICZENIE_PATH) return "billing";
  if (p === FOTO_UMOW_SIE_PATH) return "booking";
  return "tiles";
}
