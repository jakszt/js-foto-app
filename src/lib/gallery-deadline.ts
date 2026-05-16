/** Czas „najpóźniej do” na stronie galerii = opłata + 24 h. */
export const GALLERY_READY_HOURS = 24;

export function galleryDeadlineTimestampMs(paidAtIso: string): number {
  const t = Date.parse(paidAtIso);
  if (Number.isNaN(t)) return Number.NaN;
  return t + GALLERY_READY_HOURS * 60 * 60 * 1000;
}

export function formatDeadlinePlWarsaw(deadlineMs: number): string {
  if (!Number.isFinite(deadlineMs)) return "—";
  return new Intl.DateTimeFormat("pl-PL", {
    timeZone: "Europe/Warsaw",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(deadlineMs));
}
