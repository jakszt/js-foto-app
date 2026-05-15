import type { Metadata } from "next";

import { PhotographerCheckout } from "@/components/photographer-checkout";

export const metadata: Metadata = {
  title: "Umów sesję — Jakub Sztuba",
  description:
    "Wybierz termin sesji zdjęciowej w kalendarzu — potwierdzenie z Google Calendar.",
};

export default function FotoUmowSiePage() {
  return <PhotographerCheckout />;
}
