/** Cena katalogowa jednej **płatnej** sztuki przed promocją 3+1 — brutto (PLN).
 * Suma brutto = płatne sztuki × 30 zł; **średnia brutto/szt.** = suma ÷ wszystkie zdjęcia
 * (np. 4 zdj.: 90 zł ÷ 4 = 22,50 zł; 5 zdj.: 120 zł ÷ 5 = 24 zł).
 */
export const PHOTO_GROSS_PLN = 30;

/**
 * Średnia cena brutto za sztukę przy pełnych wielokrotnościach 4 zdjęć (3+1) = 22,50 zł.
 */
export const PROMO_AVG_GROSS_FULL_GROUP_PLN = 22.5;

export const PHOTO_COUNT_MIN = 1;
export const PHOTO_COUNT_MAX = 20;

export const PHOTO_VAT_PERCENT = 23 as const;

/** Nazwa pozycji na fakturze VAT w inFakcie (stawka 23% — `tax_symbol`). */
export const INFAKT_LINE_ITEM_NAME =
  "Przygotowanie wizualnych materiałów promocyjnych";

/** Promocja 3+1: co 4. zdjęcie gratis — liczba **płatnych** sztuk (× 30 zł brutto każda). */
export function billablePhotoCount(photoCount: number): number {
  return photoCount - Math.floor(photoCount / 4);
}

/** Suma brutto zamówienia (płatne sztuki × cena katalogowa). */
export function totalGrossPln(photoCount: number): number {
  return billablePhotoCount(photoCount) * PHOTO_GROSS_PLN;
}

/** Netto jednej sztuki przy danej stawce VAT (zaokrąglenie do grosza). */
export function unitNetPlnFromGross(
  grossPln: number,
  vatPercent: number = PHOTO_VAT_PERCENT
): number {
  return Math.round((grossPln / (1 + vatPercent / 100)) * 100) / 100;
}

/** Suma netto całej pozycji (z sumy brutto po promocji, VAT 23%). */
export function lineNetTotalPln(photoCount: number): number {
  const gross = totalGrossPln(photoCount);
  return Math.round((gross / (1 + PHOTO_VAT_PERCENT / 100)) * 100) / 100;
}

/** Średnia cena brutto za jedno zdjęcie w zamówieniu (do podsumowania UI / maili). */
export function promoAvgGrossPerPhotoPln(photoCount: number): number {
  if (photoCount < 1) return PHOTO_GROSS_PLN;
  return Math.round((totalGrossPln(photoCount) / photoCount) * 100) / 100;
}

export function formatPln(amount: number): string {
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
