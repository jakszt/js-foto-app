import type { Metadata } from "next";
import Link from "next/link";

import { FOTO_ROZLICZENIE_PATH } from "@/lib/foto-routes";
import {
  formatIbanSpaced,
  getInvoiceTransferConfig,
} from "@/lib/invoice-transfer-details";

export const metadata: Metadata = {
  title: "Dziękujemy — dane do przelewu",
  description:
    "Faktura została wystawiona. Opłać zdjęcia przelewem na wskazane konto.",
};

export default function FotoRozliczenieDziekujemyPage() {
  const { bankName, bankAccountCompact } = getInvoiceTransferConfig();
  const ibanDisplay = formatIbanSpaced(bankAccountCompact);

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-8 px-4 py-16 sm:px-6">
      <header className="space-y-2 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Dziękujemy
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
          Faktura została wystawiona. Na fakturze jako forma płatności jest{" "}
          <strong className="text-foreground">przelew</strong> — proszę o
          wpłatę na poniższe konto (kwota i tytuł są na fakturze w PDF z maila).
        </p>
      </header>

      <section
        className="rounded-xl border border-border bg-card px-5 py-5 shadow-sm ring-1 ring-foreground/5"
        aria-labelledby="transfer-heading"
      >
        <h2
          id="transfer-heading"
          className="text-sm font-semibold uppercase tracking-wide text-muted-foreground"
        >
          Dane do przelewu
        </h2>
        <dl className="mt-4 space-y-3 text-sm">
          <div>
            <dt className="text-muted-foreground">Sposób płatności</dt>
            <dd className="font-medium text-foreground">Przelew</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Nazwa banku</dt>
            <dd className="font-medium text-foreground">{bankName}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Nr konta (IBAN)</dt>
            <dd className="break-all font-mono text-base font-semibold tabular-nums tracking-tight text-foreground">
              {ibanDisplay}
            </dd>
          </div>
        </dl>
      </section>

      <p className="text-center text-xs text-muted-foreground">
        Sprawdź skrzynkę e-mail — wysłaliśmy wiadomość z linkiem / fakturą w PDF.
      </p>

      <div className="text-center">
        <Link
          href={FOTO_ROZLICZENIE_PATH}
          className="text-sm font-medium text-[color-mix(in_oklab,var(--accent)_88%,var(--foreground))] underline underline-offset-4 hover:text-foreground"
        >
          ← Wróć do rozliczenia
        </Link>
      </div>
    </div>
  );
}
