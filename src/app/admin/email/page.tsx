import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  buildFotoPodgladConfirmationEmail,
  buildFotoPodgladNotifyEmail,
} from "@/lib/foto-podglad-email";
import {
  buildCheckoutPaymentEmail,
  buildPostPaymentGalleryEmail,
} from "@/lib/mailjet";

export const metadata: Metadata = {
  title: "Podgląd maili transakcyjnych",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type Search = { key?: string | string[] };

const SAMPLE = {
  fullName: "Jan Kowalski",
  paymentUrl: "https://example.infakt.pl/platnosc/przykladowy-link",
  photoCount: 4,
  totalGrossPln: 90,
} as const;

function EmailPreviewBlock({
  title,
  description,
  subject,
  html,
}: {
  title: string;
  description: string;
  subject: string;
  html: string;
}) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-foreground">
          {title}
        </h2>
        <p className="text-sm text-muted-foreground">{description}</p>
        <p className="mt-1 font-mono text-xs text-foreground/80">
          <span className="text-muted-foreground">Temat:</span> {subject}
        </p>
      </div>
      <div className="overflow-hidden rounded-xl border border-border bg-[#f0efeb] shadow-sm ring-1 ring-foreground/5">
        <iframe
          title={title}
          srcDoc={html}
          className="block h-[min(85vh,900px)] w-full border-0 bg-white"
          sandbox="allow-popups allow-popups-to-escape-sandbox"
        />
      </div>
    </section>
  );
}

export default async function AdminEmailPreviewPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const q = await searchParams;
  const keyParam = typeof q.key === "string" ? q.key : Array.isArray(q.key) ? q.key[0] : undefined;
  const secret = process.env.ADMIN_EMAIL_PREVIEW_SECRET?.trim();
  if (secret && keyParam !== secret) {
    notFound();
  }

  const checkoutWithPdf = buildCheckoutPaymentEmail({
    ...SAMPLE,
    pdfAttached: true,
  });
  const checkoutNoPdf = buildCheckoutPaymentEmail({
    ...SAMPLE,
    pdfAttached: false,
  });
  const checkoutTransfer = buildCheckoutPaymentEmail({
    ...SAMPLE,
    paymentUrl: "https://example.com/foto/rozliczenie/dziekujemy",
    pdfAttached: true,
    viaTransferOnly: true,
  });
  const postPaymentGallery = buildPostPaymentGalleryEmail({
    fullName: SAMPLE.fullName,
    email: "jan.kowalski@example.com",
    galleryUrl: "https://jakubsztuba.pl/foto/galeria?email=jan.kowalski%40example.com",
  });
  const fotoPodgladConfirmation = buildFotoPodgladConfirmationEmail({
    fullName: SAMPLE.fullName,
  });
  const fotoPodgladNotify = buildFotoPodgladNotifyEmail({
    fullName: SAMPLE.fullName,
    email: "jan.kowalski@example.com",
    dogName: "Burek",
    photoFilename: "burek-zdjecie.jpg",
  });

  return (
    <main className="mx-auto min-h-screen max-w-4xl space-y-12 px-4 py-10 sm:px-6">
      <header className="space-y-2 border-b border-border pb-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Admin
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Podgląd wizualny maili
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Wszystkie szablony wysyłane przez Mailjet z tej aplikacji. Linki i dane są
          przykładowe — w środowisku produkcyjnym ustaw{" "}
          <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
            ADMIN_EMAIL_PREVIEW_SECRET
          </code>{" "}
          i otwieraj stronę z{" "}
          <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
            ?key=…
          </code>
          .
        </p>
      </header>

      <EmailPreviewBlock
        title="1. Link do płatności (z informacją o PDF)"
        description="Po utworzeniu faktury w inFakcie — z załącznikiem PDF w prawdziwej wysyłce, gdy uda się pobrać plik."
        subject={checkoutWithPdf.subject}
        html={checkoutWithPdf.htmlPart}
      />

      <EmailPreviewBlock
        title="2. Link do płatności (bez PDF w treści)"
        description="Ten sam szablon, gdy PDF nie został dołączony (np. błąd pobrania z API inFakt)."
        subject={checkoutNoPdf.subject}
        html={checkoutNoPdf.htmlPart}
      />

      <EmailPreviewBlock
        title="3. Faktura na przelew (bez linku Autopay z inFaktu)"
        description="Gdy API nie zwraca linku szybkiej płatności — mail z danymi konta i przyciskiem do strony podziękowania."
        subject={checkoutTransfer.subject}
        html={checkoutTransfer.htmlPart}
      />

      <EmailPreviewBlock
        title="4. Po opłaceniu — galeria (24h)"
        description="Webhook inFakt invoice_paid: link do /foto/galeria?email=…"
        subject={postPaymentGallery.subject}
        html={postPaymentGallery.htmlPart}
      />

      <EmailPreviewBlock
        title="5. Chcę zobaczyć zdjęcia! — powiadomienie dla Ciebie"
        description="Na jakub.sztuba@gmail.com po każdym zgłoszeniu z kafelka /foto (ze zdjęciem psa w załączniku)."
        subject={fotoPodgladNotify.subject}
        html={fotoPodgladNotify.htmlPart}
      />

      <EmailPreviewBlock
        title="6. Chcę zobaczyć zdjęcia! — potwierdzenie dla klienta"
        description="Na adres e-mail z formularza po wysłaniu /foto/podglad."
        subject={fotoPodgladConfirmation.subject}
        html={fotoPodgladConfirmation.htmlPart}
      />

      <footer className="border-t border-border pt-8 text-xs text-muted-foreground">
        <p>
          Wersje tekstowe (plain text) zawierają te same treści plus stopkę kontaktową i
          dane LOCALGROWTH — generuje je{" "}
          <code className="rounded bg-muted px-1 font-mono">appendFooterToPlainText</code>.
        </p>
      </footer>
    </main>
  );
}
