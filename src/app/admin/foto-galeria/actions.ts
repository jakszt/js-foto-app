"use server";

import { revalidatePath } from "next/cache";

import { assertAdminFormKey } from "@/lib/admin-foto-auth";
import {
  setAdminNotesForRowId,
  setGalleryDownloadUrlForRowId,
} from "@/lib/checkout-persistence";

export type AdminRowSaveState =
  | { ok: true; message: string }
  | { ok: false; error: string };

export async function adminSaveRowNotesAction(
  _prev: AdminRowSaveState | null,
  formData: FormData
): Promise<AdminRowSaveState> {
  const key = formData.get("adminKey");
  if (!assertAdminFormKey(key)) {
    return { ok: false, error: "Brak uprawnień (nieprawidłowy klucz admina)." };
  }
  const rowId = formData.get("rowId");
  const notes = formData.get("adminNotes");
  if (typeof rowId !== "string") {
    return { ok: false, error: "Brak identyfikatora wiersza." };
  }
  const text = typeof notes === "string" ? notes : "";
  const res = await setAdminNotesForRowId(rowId, text);
  if (!res.ok) {
    return { ok: false, error: res.error };
  }
  revalidatePath("/admin/foto-galeria");
  return { ok: true, message: "Notatka zapisana." };
}

export async function adminSaveRowDownloadAction(
  _prev: AdminRowSaveState | null,
  formData: FormData
): Promise<AdminRowSaveState> {
  const key = formData.get("adminKey");
  if (!assertAdminFormKey(key)) {
    return { ok: false, error: "Brak uprawnień (nieprawidłowy klucz admina)." };
  }
  const rowId = formData.get("rowId");
  const url = formData.get("galleryDownloadUrl");
  if (typeof rowId !== "string") {
    return { ok: false, error: "Brak identyfikatora wiersza." };
  }
  const raw = typeof url === "string" ? url.trim() : "";
  const res = await setGalleryDownloadUrlForRowId(rowId, raw.length > 0 ? raw : null);
  if (!res.ok) {
    return { ok: false, error: res.error };
  }
  revalidatePath("/foto/galeria");
  revalidatePath("/admin/foto-galeria");
  return { ok: true, message: "Link do pobrania zapisany." };
}
