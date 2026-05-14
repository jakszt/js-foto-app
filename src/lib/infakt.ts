export type CreateInvoiceInput = {
  fullName: string;
  email: string;
  street: string;
  postalCode: string;
  city: string;
  isCompany: boolean;
  nip?: string;
};

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

async function readJsonBody(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text.trim()) {
    throw new Error(`inFakt: pusta odpowiedź (HTTP ${res.status})`);
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error(
      `inFakt: odpowiedź nie jest JSON (HTTP ${res.status}): ${text.slice(0, 240)}`
    );
  }
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
  service: {
    name: string;
    /** Liczba sztuk (np. zdjęć). */
    quantity: number;
    /** Cena netto jednej sztuki w PLN (API inFakt — grosze). */
    unitNetPricePln: number;
    taxPercent: 23;
  },
  dates: {
    /** Data wystawienia faktury (YYYY-MM-DD). */
    invoiceDate: string;
    /** Data sprzedaży / świadczenia (YYYY-MM-DD). */
    sellDate: string;
    /** Termin płatności (YYYY-MM-DD). */
    paymentTo: string;
  }
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

  const clientJson = (await readJsonBody(clientRes)) as Record<string, unknown>;
  const clientId = readClientId(clientJson);

  if (clientId == null) {
    throw new Error("inFakt: brak ID klienta w odpowiedzi");
  }

  const qty = Math.max(1, Math.floor(service.quantity));
  const unitNetGrosze = Math.round(service.unitNetPricePln * 100);
  const lineNetGrosze = Math.round(unitNetGrosze * qty);

  const invoiceBody = {
    kind: "vat",
    invoice_date: dates.invoiceDate,
    sell_date: dates.sellDate,
    payment_to: dates.paymentTo,
    client_id: clientId,
    services: [
      {
        name: service.name,
        quantity: qty,
        tax_symbol: String(service.taxPercent),
        net_price: lineNetGrosze,
        unit_net_price: unitNetGrosze,
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

  const invJson = await readJsonBody(invRes);
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

/** PDF faktury do załącznika w mailu (GET …/pdf.json). */
export async function fetchInvoicePdfBase64(
  apiKey: string,
  baseUrl: string,
  invoiceUuid: string
): Promise<{ base64: string; filename: string } | null> {
  const normalizedBase = baseUrl.replace(/\/$/, "");
  const url = `${normalizedBase}/invoices/${encodeURIComponent(invoiceUuid)}/pdf.json?document_type=original`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json, application/pdf;q=0.9,*/*;q=0.8",
      "X-inFakt-ApiKey": apiKey,
    },
  });

  if (!res.ok) {
    console.warn("[infakt] PDF:", res.status, (await res.text()).slice(0, 200));
    return null;
  }

  const ct = (res.headers.get("content-type") ?? "").toLowerCase();
  const filename = `faktura-${invoiceUuid.slice(0, 8)}.pdf`;

  if (ct.includes("application/pdf")) {
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 64) return null;
    return { base64: buf.toString("base64"), filename };
  }

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    return null;
  }

  const extractB64 = (o: unknown): string | null => {
    if (!o || typeof o !== "object") return null;
    const r = o as Record<string, unknown>;
    for (const k of ["pdf", "content", "data", "file"]) {
      const v = r[k];
      if (typeof v === "string" && v.length > 64) return v.replace(/\s/g, "");
    }
    const inv = r.invoice;
    if (inv && typeof inv === "object") {
      const inner = inv as Record<string, unknown>;
      for (const k of ["pdf", "content"]) {
        const v = inner[k];
        if (typeof v === "string" && v.length > 64) return v.replace(/\s/g, "");
      }
    }
    return null;
  };

  const b64 = extractB64(json);
  if (!b64) {
    console.warn("[infakt] PDF: brak base64 w odpowiedzi JSON");
    return null;
  }

  return { base64: b64, filename };
}
