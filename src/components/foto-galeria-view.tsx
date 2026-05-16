"use client";

import { useEffect, useMemo, useState } from "react";

import { buttonVariants } from "@/components/ui/button";
import {
  formatDeadlinePlWarsaw,
  galleryDeadlineTimestampMs,
} from "@/lib/gallery-deadline";
import { cn } from "@/lib/utils";

const CONTACT_EMAIL = "jakub.sztuba@gmail.com";
const CONTACT_TEL_DISPLAY = "+48 509 167 828";
const CONTACT_TEL_HREF = "tel:+48509167828";

function formatRemaining(ms: number): string {
  if (ms <= 0) return "0:00:00";
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export function FotoGaleriaView(props: {
  fullName: string;
  paidAtIso: string;
  downloadUrl: string | null;
}) {
  const deadlineMs = useMemo(
    () => galleryDeadlineTimestampMs(props.paidAtIso),
    [props.paidAtIso]
  );
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const remaining = deadlineMs - now;
  const pastDeadline = Number.isFinite(deadlineMs) && remaining <= 0;

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-8 px-4 py-14 sm:px-6">
      <header className="space-y-2 text-center sm:text-left">
        <p className="text-sm text-muted-foreground">Cześć {props.fullName},</p>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Twoje zdjęcia
        </h1>
      </header>

      <section
        className="rounded-xl border border-border bg-card px-5 py-5 shadow-sm ring-1 ring-foreground/5"
        aria-labelledby="deadline-heading"
      >
        <h2
          id="deadline-heading"
          className="text-sm font-semibold uppercase tracking-wide text-muted-foreground"
        >
          Termin przygotowania
        </h2>
        <p className="mt-3 text-base leading-relaxed text-foreground">
          Twoje zdjęcia będą dostępne{" "}
          <span className="font-semibold">najpóźniej do</span>:{" "}
          <time dateTime={new Date(deadlineMs).toISOString()}>
            {formatDeadlinePlWarsaw(deadlineMs)}
          </time>{" "}
          <span className="text-muted-foreground">(czas polski)</span>
        </p>
        {!pastDeadline && Number.isFinite(deadlineMs) ? (
          <p
            className="mt-2 font-mono text-lg tabular-nums text-[color-mix(in_oklab,var(--accent)_75%,var(--foreground))]"
            aria-live="polite"
          >
            Pozostało: {formatRemaining(remaining)}
          </p>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            Upłynął termin 24 h od zaksięgowania płatności — jeśli paczka nie jest
            jeszcze widoczna poniżej, napisz lub zadzwoń.
          </p>
        )}
      </section>

      <section aria-labelledby="download-heading">
        <h2
          id="download-heading"
          className="sr-only"
        >
          Pobieranie zdjęć
        </h2>
        {props.downloadUrl ? (
          <div className="flex flex-col items-center gap-3">
            <a
              href={props.downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                buttonVariants({ variant: "default", size: "lg" }),
                "inline-flex h-auto min-h-14 w-full max-w-md items-center justify-center py-5 text-base font-bold tracking-wide",
                "bg-[color-mix(in_oklab,var(--accent)_88%,white)] text-[#2a241c] shadow-md hover:bg-[color-mix(in_oklab,var(--accent)_78%,white)]"
              )}
            >
              POBIERZ ZDJĘCIA
            </a>
            <p className="text-center text-xs text-muted-foreground">
              Otwiera się w nowej karcie — link zewnętrzny (np. Dropbox, Drive).
            </p>
          </div>
        ) : (
          <div
            className="rounded-xl border border-dashed border-border/80 bg-muted/25 px-5 py-10 text-center"
            role="status"
          >
            <p className="text-sm font-medium text-muted-foreground">
              Tutaj pojawi się możliwość pobrania zdjęć
            </p>
          </div>
        )}
      </section>

      <footer className="border-t border-border pt-8 text-center text-sm sm:text-left">
        <p className="font-medium text-foreground">Masz pytania?</p>
        <p className="mt-2 space-y-1 text-muted-foreground">
          <a
            className="block text-[color-mix(in_oklab,var(--accent)_80%,var(--foreground))] underline underline-offset-4 hover:text-foreground"
            href={`mailto:${CONTACT_EMAIL}`}
          >
            {CONTACT_EMAIL}
          </a>
          <a
            className="block text-[color-mix(in_oklab,var(--accent)_80%,var(--foreground))] underline underline-offset-4 hover:text-foreground"
            href={CONTACT_TEL_HREF}
          >
            {CONTACT_TEL_DISPLAY}
          </a>
        </p>
      </footer>
    </div>
  );
}
