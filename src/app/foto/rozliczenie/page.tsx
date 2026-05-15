import type { Metadata } from "next";

import { PhotographerCheckout } from "@/components/photographer-checkout";

export const metadata: Metadata = {
  title: "Rozliczenie po sesji — Jakub Sztuba",
  description:
    "Opłać zdjęcia po sesji — faktura w inFakcie; płatność online lub przelew na wskazane konto.",
};

export default function FotoRozliczeniePage() {
  return <PhotographerCheckout />;
}
