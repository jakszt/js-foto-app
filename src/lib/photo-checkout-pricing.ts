/** Cena jednego zdjęcia — brutto (PLN). */
export const PHOTO_GROSS_PLN = 40;

export const PHOTO_COUNT_MIN = 1;
export const PHOTO_COUNT_MAX = 20;

export const PHOTO_VAT_PERCENT = 23 as const;

/** Nazwa pozycji na fakturze VAT w inFakcie (stawka 23% — `tax_symbol`). */
export const INFAKT_LINE_ITEM_NAME =
  "Przygotowanie wizualnych materiałów promocyjnych";

/** Netto jednej sztuki przy danej stawce VAT (zaokrąglenie do grosza). */
export function unitNetPlnFromGross(
  grossPln: number,
  vatPercent: number = PHOTO_VAT_PERCENT
): number {
  return Math.round((grossPln / (1 + vatPercent / 100)) * 100) / 100;
}

export function lineNetTotalPln(photoCount: number): number {
  const unit = unitNetPlnFromGross(PHOTO_GROSS_PLN);
  return Math.round(unit * photoCount * 100) / 100;
}

export function totalGrossPln(photoCount: number): number {
  return photoCount * PHOTO_GROSS_PLN;
}

export function formatPln(amount: number): string {
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
