import { NextResponse } from "next/server";
import { checkoutFormSchema } from "@/lib/checkout-schema";
import { createInvoiceWithOnlinePayment } from "@/lib/infakt";

export async function POST(req: Request) {
  const apiKey = process.env.INFAKT_API_KEY;
  const baseUrl =
    process.env.INFAKT_API_BASE_URL?.trim() || "https://api.infakt.pl/v3";

  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "Brak INFAKT_API_KEY w zmiennych środowiskowych. Dodaj klucz API z inFaktu.",
      },
      { status: 500 }
    );
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Niepoprawne JSON" }, { status: 400 });
  }

  const parsed = checkoutFormSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Walidacja nieudana", issues: parsed.error.flatten() },
      { status: 422 }
    );
  }

  const netPln = Number(process.env.INFAKT_PHOTO_NET_PRICE_PLN ?? "100");
  const serviceName =
    process.env.INFAKT_PHOTO_SERVICE_NAME?.trim() ||
    "Opłata za zdjęcia — sesja fotograficzna";

  try {
    const { paymentUrl, invoiceUuid } = await createInvoiceWithOnlinePayment(
      apiKey,
      baseUrl,
      {
        fullName: parsed.data.fullName,
        email: parsed.data.email,
        street: parsed.data.street,
        postalCode: parsed.data.postalCode,
        city: parsed.data.city,
        isCompany: parsed.data.isCompany,
        nip: parsed.data.nip,
      },
      { name: serviceName, netPricePln: Number.isFinite(netPln) ? netPln : 100, taxPercent: 23 }
    );

    return NextResponse.json({ paymentUrl, invoiceUuid });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Nieznany błąd";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
