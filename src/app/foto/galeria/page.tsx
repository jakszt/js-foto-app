import type { Metadata } from "next";
import { z } from "zod";

import { FotoGaleriaView } from "@/components/foto-galeria-view";
import { getFotoGalleryByEmail } from "@/lib/checkout-persistence";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export const metadata: Metadata = {
  title: "Twoje zdjęcia — galeria",
  description: "Odbiór zdjęć po opłaceniu sesji.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const emailParam = z.string().trim().email();

type Search = { email?: string | string[] };

export default async function FotoGaleriaPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const q = await searchParams;
  const raw =
    typeof q.email === "string" ? q.email : Array.isArray(q.email) ? q.email[0] : undefined;

  if (!raw?.trim()) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center sm:px-6">
        <h1 className="text-xl font-semibold text-foreground">Galeria</h1>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          Otwórz link z maila po opłaceniu faktury — zawiera adres w formacie{" "}
          <span className="font-mono text-xs">
            /foto/galeria?email=twoj@email.pl
          </span>
          .
        </p>
      </div>
    );
  }

  const parsed = emailParam.safeParse(raw);
  if (!parsed.success) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center sm:px-6">
        <h1 className="text-xl font-semibold text-foreground">Niepoprawny link</h1>
        <p className="mt-4 text-sm text-muted-foreground">
          Adres e-mail w linku jest nieprawidłowy. Użyj dokładnie tego z wiadomości po
          płatności.
        </p>
      </div>
    );
  }

  if (!createSupabaseAdmin()) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-sm text-muted-foreground">
          Galeria jest chwilowo niedostępna (brak konfiguracji serwera).
        </p>
      </div>
    );
  }

  const row = await getFotoGalleryByEmail(parsed.data);
  if (!row) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center sm:px-6">
        <h1 className="text-xl font-semibold text-foreground">Brak dostępu</h1>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          Nie znaleziono opłaconej sesji dla tego adresu e-mail. Sprawdź, czy używasz
          dokładnie tego samego adresu co przy rozliczeniu oraz czy płatność została
          zaksięgowana. W razie wątpliwości napisz na{" "}
          <a className="underline" href="mailto:jakub.sztuba@gmail.com">
            jakub.sztuba@gmail.com
          </a>
          .
        </p>
      </div>
    );
  }

  return (
    <FotoGaleriaView
      fullName={row.fullName}
      paidAtIso={row.paidAt}
      downloadUrl={row.downloadUrl}
    />
  );
}
