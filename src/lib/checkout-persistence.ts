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
    infakt_invoice_uuid: data.infakt_invoice_uuid,
    infakt_error: data.infakt_error,
  });

  if (error) {
    console.error("[checkout] Supabase insert:", error.message, error);
  }
}
