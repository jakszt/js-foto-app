import type { CheckoutFormValues } from "@/lib/checkout-schema";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export type PersistCheckoutPayload = CheckoutFormValues & {
  infakt_invoice_uuid: string | null;
  infakt_error: string | null;
};

/** Zapis do Supabase — nie rzuca; loguje błąd przy braku konfiguracji lub insert. */
export async function persistFotoRozliczenie(
  data: PersistCheckoutPayload
): Promise<void> {
  const supabase = createSupabaseAdmin();
  if (!supabase) {
    console.error(
      "[checkout] Brak SUPABASE_URL (lub NEXT_PUBLIC_SUPABASE_URL) / SUPABASE_SERVICE_ROLE_KEY — pomijam zapis."
    );
    return;
  }

  const { error } = await supabase.from("foto_rozliczenia").insert({
    full_name: data.fullName,
    email: data.email,
    street: data.street,
    postal_code: data.postalCode,
    city: data.city,
    is_company: data.isCompany,
    nip: data.isCompany ? (data.nip?.trim() || null) : null,
    photo_count: data.photoCount,
    infakt_invoice_uuid: data.infakt_invoice_uuid,
    infakt_error: data.infakt_error,
  });

  if (error) {
    console.error("[checkout] Supabase insert:", error.message, error);
  }
}

/**
 * Atomowo rezerwuje wysyłkę podziękowania (`payment_thank_you_sent_at`), żeby równoległe
 * webhooki nie wysłały dwóch maili. Przy błędzie Mailjet wywołaj `clearPaymentThankYouReservation`.
 */
export async function claimPaymentThankYouRecipient(
  invoiceUuid: string
): Promise<{ fullName: string; email: string } | null> {
  const supabase = createSupabaseAdmin();
  if (!supabase) return null;

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("foto_rozliczenia")
    .update({ payment_thank_you_sent_at: now })
    .eq("infakt_invoice_uuid", invoiceUuid)
    .is("payment_thank_you_sent_at", null)
    .select("full_name, email");

  if (error) {
    console.error("[infakt-webhook] claim thank-you:", error.message, error);
    return null;
  }
  const row = data?.[0];
  if (!row?.email || !row.full_name) return null;
  return { fullName: row.full_name, email: row.email };
}

export async function clearPaymentThankYouReservation(
  invoiceUuid: string
): Promise<void> {
  const supabase = createSupabaseAdmin();
  if (!supabase) return;
  const { error } = await supabase
    .from("foto_rozliczenia")
    .update({ payment_thank_you_sent_at: null })
    .eq("infakt_invoice_uuid", invoiceUuid);
  if (error) {
    console.error("[infakt-webhook] clear thank-you flag:", error.message, error);
  }
}
