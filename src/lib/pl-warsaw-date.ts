/**
 * Kalendarzowa data YYYY-MM-DD w strefie Europe/Warsaw
 * (np. data sprzedaży / data wystawienia faktury z momentu obsługi żądania).
 */
export function formatCalendarDateWarsaw(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Warsaw",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/** Termin płatności: ta sama logika co wcześniej (+7 dni od daty wystawienia). */
export function paymentDueDateWarsaw(from: Date, addDays: number): string {
  const t = from.getTime() + addDays * 24 * 60 * 60 * 1000;
  return formatCalendarDateWarsaw(new Date(t));
}
