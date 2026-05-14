export type CreateInvoiceInput = {
  fullName: string;
  email: string;
  street: string;
  postalCode: string;
  city: string;
  isCompany: boolean;
  nip?: string;
};

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function paymentDeadlineISO(): string {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().slice(0, 10);
}

function extractPaymentLink(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const root = payload as Record<string, unknown>;
  const invoice =
    root.invoice && typeof root.invoice === "object"
      ? (root.invoice as Record<string, unknown>)
      : root;

  const ext = invoice.extensions;
  if (ext && typeof ext === "object") {
    const payments = (ext as Record<string, unknown>).payments;
    if (payments && typeof payments === "object") {
      const link = (payments as Record<string, unknown>).link;
      if (typeof link === "string" && link.length > 0) return link;
    }
  }

  const direct =
    invoice.online_payment_url ??
    invoice.payment_url ??
    invoice.fast_payment_url;
  if (typeof direct === "string" && direct.length > 0) return direct;

  return null;
}

function cleanNip(nip: string): string {
  return nip.replace(/\D/g, "");
}

function readClientId(json: unknown): number | null {
  if (!json || typeof json !== "object") return null;
  const o = json as Record<string, unknown>;
  if (typeof o.id === "number") return o.id;
  if (typeof o.id === "string" && /^\d+$/.test(o.id)) return Number(o.id);
  const inner = o.client;
  if (inner && typeof inner === "object") {
    const id = (inner as Record<string, unknown>).id;
    if (typeof id === "number") return id;
    if (typeof id === "string" && /^\d+$/.test(id)) return Number(id);
  }
  return null;
}

export async function createInvoiceWithOnlinePayment(
  apiKey: string,
  baseUrl: string,
  input: CreateInvoiceInput,
  service: { name: string; netPricePln: number; taxPercent: 23 }
): Promise<{ paymentUrl: string; invoiceUuid?: string }> {
  const normalizedBase = baseUrl.replace(/\/$/, "");

  const clientBody: Record<string, unknown> = {
    company_name: input.fullName,
    street: input.street,
    city: input.city,
    postal_code: input.postalCode,
    country: "PL",
    email: input.email,
  };

  if (input.isCompany && input.nip) {
    clientBody.nip = cleanNip(input.nip);
  }

  const clientRes = await fetch(`${normalizedBase}/clients.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-inFakt-ApiKey": apiKey,
    },
    body: JSON.stringify({ client: clientBody }),
  });

  if (!clientRes.ok) {
    const errText = await clientRes.text();
    throw new Error(
      `inFakt: nie udało się utworzyć klienta (${clientRes.status}): ${errText.slice(0, 500)}`
    );
  }

  const clientJson = (await clientRes.json()) as Record<string, unknown>;
  const clientId = readClientId(clientJson);

  if (clientId == null) {
    throw new Error("inFakt: brak ID klienta w odpowiedzi");
  }

  const netGrosze = Math.round(service.netPricePln * 100);

  const invoiceBody = {
    kind: "vat",
    invoice_date: todayISO(),
    sell_date: todayISO(),
    payment_to: paymentDeadlineISO(),
    client_id: clientId,
    services: [
      {
        name: service.name,
        quantity: 1,
        tax_symbol: String(service.taxPercent),
        net_price: netGrosze,
        unit_net_price: netGrosze,
      },
    ],
  };

  const invRes = await fetch(`${normalizedBase}/invoices.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-inFakt-ApiKey": apiKey,
    },
    body: JSON.stringify({ invoice: invoiceBody }),
  });

  if (!invRes.ok) {
    const errText = await invRes.text();
    throw new Error(
      `inFakt: nie udało się wystawić faktury (${invRes.status}): ${errText.slice(0, 500)}`
    );
  }

  const invJson = await invRes.json();
  const paymentUrl = extractPaymentLink(invJson);

  if (!paymentUrl) {
    throw new Error(
      "inFakt: brak linku do szybkiej płatności w odpowiedzi. Włącz płatności online (np. Autopay) w inFakcie — dokumentacja: https://docs.infakt.pl/"
    );
  }

  const flat = invJson as Record<string, unknown>;
  const inner =
    flat.invoice && typeof flat.invoice === "object"
      ? (flat.invoice as Record<string, unknown>)
      : flat;
  const uuid = typeof inner.uuid === "string" ? inner.uuid : undefined;

  return { paymentUrl, invoiceUuid: uuid };
}
