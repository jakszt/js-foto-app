import type { CheckoutFormValues } from "@/lib/checkout-schema";
import { normalizeCheckoutEmail } from "@/lib/email-normalize";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export type PersistCheckoutPayload = CheckoutFormValues & {
  infakt_invoice_uuid: string | null;
  infakt_error: string | null;
};

export type FotoGalleryRow = {
  fullName: string;
  paidAt: string;
  downloadUrl: string | null;
};

/** Pełny wiersz do tabeli admina (rozliczenia). */
export type FotoRozliczenieAdminRow = {
  id: string;
  full_name: string;
  email: string;
  street: string;
  postal_code: string;
  city: string;
  is_company: boolean;
  nip: string | null;
  photo_count: number;
  submitted_at: string | null;
  paid_at: string | null;
  infakt_invoice_uuid: string | null;
  infakt_error: string | null;
  gallery_download_url: string | null;
  admin_notes: string | null;
  admin_photo_url: string | null;
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

  const submittedAt = new Date().toISOString();

  const { error } = await supabase.from("foto_rozliczenia").insert({
    full_name: data.fullName,
    email: normalizeCheckoutEmail(data.email),
    street: data.street,
    postal_code: data.postalCode,
    city: data.city,
    is_company: data.isCompany,
    nip: data.isCompany ? (data.nip?.trim() || null) : null,
    photo_count: data.photoCount,
    infakt_invoice_uuid: data.infakt_invoice_uuid,
    infakt_error: data.infakt_error,
    submitted_at: submittedAt,
  });

  if (error) {
    console.error("[checkout] Supabase insert:", error.message, error);
  }
}

/**
 * Atomowo rezerwuje wysyłkę maila po opłaceniu (`payment_thank_you_sent_at`) i ustawia `paid_at`
 * (pierwszy raz), żeby równoległe webhooki nie wysłały dwóch maili.
 */
export async function claimPaymentThankYouRecipient(
  invoiceUuid: string
): Promise<{ fullName: string; email: string; paidAt: string } | null> {
  const supabase = createSupabaseAdmin();
  if (!supabase) return null;

  const now = new Date().toISOString();

  const { data: pick, error: pickErr } = await supabase
    .from("foto_rozliczenia")
    .select("id, paid_at")
    .eq("infakt_invoice_uuid", invoiceUuid)
    .is("payment_thank_you_sent_at", null)
    .maybeSingle();

  if (pickErr) {
    console.error("[infakt-webhook] claim pick:", pickErr.message, pickErr);
    return null;
  }
  if (!pick?.id) return null;

  const paidAtToStore = pick.paid_at ?? now;

  const { data: done, error: updErr } = await supabase
    .from("foto_rozliczenia")
    .update({
      paid_at: paidAtToStore,
      payment_thank_you_sent_at: now,
    })
    .eq("id", pick.id)
    .is("payment_thank_you_sent_at", null)
    .select("full_name, email, paid_at")
    .maybeSingle();

  if (updErr) {
    console.error("[infakt-webhook] claim update:", updErr.message, updErr);
    return null;
  }
  if (!done?.email || !done.full_name) return null;

  return {
    fullName: done.full_name,
    email: done.email,
    paidAt: (done.paid_at as string) ?? paidAtToStore,
  };
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

/** Ostatnia opłacona sesja dla adresu — do strony galerii. */
export async function getFotoGalleryByEmail(
  email: string
): Promise<FotoGalleryRow | null> {
  const supabase = createSupabaseAdmin();
  if (!supabase) return null;
  const normalized = normalizeCheckoutEmail(email);
  const trimmed = email.trim();
  const client = supabase;

  async function fetchOne(addr: string) {
    return client
      .from("foto_rozliczenia")
      .select("full_name, paid_at, gallery_download_url")
      .eq("email", addr)
      .not("paid_at", "is", null)
      .order("paid_at", { ascending: false })
      .limit(1)
      .maybeSingle();
  }

  let { data, error } = await fetchOne(normalized);
  if (error) {
    console.error("[foto-galeria] select:", error.message, error);
    return null;
  }
  if (!data?.paid_at && trimmed !== normalized) {
    const second = await fetchOne(trimmed);
    error = second.error;
    data = second.data;
    if (error) {
      console.error("[foto-galeria] select (fallback):", error.message, error);
      return null;
    }
  }

  if (!data?.paid_at || !data.full_name) return null;

  return {
    fullName: data.full_name,
    paidAt: data.paid_at,
    downloadUrl: data.gallery_download_url,
  };
}

export async function setGalleryDownloadUrlForEmail(
  email: string,
  downloadUrl: string
): Promise<{ ok: true; updated: number } | { ok: false; error: string }> {
  const supabase = createSupabaseAdmin();
  if (!supabase) {
    return { ok: false, error: "Brak konfiguracji Supabase (serwer)." };
  }
  const e = normalizeCheckoutEmail(email);
  const url = downloadUrl.trim();
  if (!/^https:\/\//i.test(url)) {
    return {
      ok: false,
      error: "Podaj bezpieczny adres URL zaczynający się od https://",
    };
  }

  const { data, error } = await supabase
    .from("foto_rozliczenia")
    .update({ gallery_download_url: url })
    .eq("email", e)
    .not("paid_at", "is", null)
    .select("id");

  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true, updated: data?.length ?? 0 };
}

export async function setGalleryDownloadUrlForRowId(
  rowId: string,
  downloadUrl: string | null
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = createSupabaseAdmin();
  if (!supabase) {
    return { ok: false, error: "Brak konfiguracji Supabase (serwer)." };
  }
  const trimmed = downloadUrl?.trim() ?? "";
  const value =
    trimmed.length === 0
      ? null
      : /^https:\/\//i.test(trimmed)
        ? trimmed
        : null;
  if (trimmed.length > 0 && value === null) {
    return {
      ok: false,
      error: "Link musi zaczynać się od https:// albo pozostaw puste, by wyczyścić.",
    };
  }

  const { error } = await supabase
    .from("foto_rozliczenia")
    .update({ gallery_download_url: value })
    .eq("id", rowId);

  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

export async function setAdminNotesForRowId(
  rowId: string,
  notes: string | null
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = createSupabaseAdmin();
  if (!supabase) {
    return { ok: false, error: "Brak konfiguracji Supabase (serwer)." };
  }
  const text = notes?.trim() ?? "";
  const { error } = await supabase
    .from("foto_rozliczenia")
    .update({ admin_notes: text.length > 0 ? text : null })
    .eq("id", rowId);

  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

export async function setAdminPhotoUrlForRowId(
  rowId: string,
  photoUrl: string | null
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = createSupabaseAdmin();
  if (!supabase) {
    return { ok: false, error: "Brak konfiguracji Supabase (serwer)." };
  }
  const { error } = await supabase
    .from("foto_rozliczenia")
    .update({ admin_photo_url: photoUrl })
    .eq("id", rowId);

  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

const ADMIN_SELECT =
  "id, full_name, email, street, postal_code, city, is_company, nip, photo_count, submitted_at, paid_at, infakt_invoice_uuid, infakt_error, gallery_download_url, admin_notes, admin_photo_url";

export async function listAllFotoRozliczeniaForAdmin(): Promise<
  FotoRozliczenieAdminRow[]
> {
  const supabase = createSupabaseAdmin();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("foto_rozliczenia")
    .select(ADMIN_SELECT)
    .order("submitted_at", { ascending: false, nullsFirst: false })
    .order("id", { ascending: false })
    .limit(300);

  if (error) {
    console.error("[admin-foto-rozliczenia] list:", error.message, error);
    return [];
  }
  return (data ?? []).map((r) => ({
    ...r,
    id: String((r as { id: string | number }).id),
  })) as FotoRozliczenieAdminRow[];
}
