import type { Metadata } from "next";

import { PhotographerCheckout } from "@/components/photographer-checkout";

export const metadata: Metadata = {
  title: "Podgląd zdjęć — Jakub Sztuba",
  description:
    "Latające Psy w Poznaniu — wyślij zdjęcie psa i otrzymaj bezpłatny podgląd kadrów.",
};

export default function FotoPodgladPage() {
  return <PhotographerCheckout />;
}
