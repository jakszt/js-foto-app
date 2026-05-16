import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AdminFotoRozliczeniaTable } from "@/app/admin/foto-galeria/admin-foto-rozliczenia-table";
import { listAllFotoRozliczeniaForAdmin } from "@/lib/checkout-persistence";

export const metadata: Metadata = {
  title: "Admin — rozliczenia i galeria",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type Search = { key?: string | string[] };

export default async function AdminFotoGaleriaPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const q = await searchParams;
  const keyParam =
    typeof q.key === "string" ? q.key : Array.isArray(q.key) ? q.key[0] : undefined;
  const secret = process.env.ADMIN_EMAIL_PREVIEW_SECRET?.trim();
  if (secret && keyParam !== secret) {
    notFound();
  }

  const rows = await listAllFotoRozliczeniaForAdmin();

  return (
    <main className="mx-auto min-h-screen max-w-[min(100vw-1rem,1400px)] space-y-8 px-3 py-10 sm:px-6">
      <header className="space-y-2 border-b border-border pb-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Admin
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Rozliczenia — tabela
        </h1>
        <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
          Wszystkie wysłane formularze rozliczenia: adres, liczba zdjęć, data wysłania, data
          opłacenia (z webhooka inFakt), zdjęcie referencyjne (upload do Supabase Storage),
          Twoje notatki oraz <strong>link paczki</strong> widoczny klientowi na stronie{" "}
          <span className="font-mono">/foto/galeria?email=…</span> po opłaceniu.
        </p>
        {secret ? (
          <p className="text-xs text-muted-foreground">
            Dostęp z parametrem{" "}
            <code className="rounded bg-muted px-1 font-mono">?key=…</code> (zmienna{" "}
            <code className="font-mono">ADMIN_EMAIL_PREVIEW_SECRET</code>).
          </p>
        ) : (
          <p className="text-xs text-amber-700 dark:text-amber-400">
            Ustaw <code className="font-mono">ADMIN_EMAIL_PREVIEW_SECRET</code> w produkcji.
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          Storage: utwórz bucket <code className="font-mono">foto_rozliczenia_admin</code>{" "}
          (publiczny odczyt), inaczej upload zdjęcia zwróci błąd — opis w migracji SQL.
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">
          Wpisy ({rows.length}
          {rows.length >= 300 ? "+" : ""})
        </h2>
        <AdminFotoRozliczeniaTable rows={rows} adminKey={keyParam ?? ""} />
      </section>
    </main>
  );
}
