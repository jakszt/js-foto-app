import type { Metadata } from "next";

import { PhotographerCheckout } from "@/components/photographer-checkout";

export const metadata: Metadata = {
  title: "Rozliczenie po sesji — Jakub Sztuba",
  description:
    "Opłać zdjęcia po sesji fotograficznej — szybka płatność online przez inFakt.",
};

export default function FotoRozliczeniePage() {
  return <PhotographerCheckout />;
}
