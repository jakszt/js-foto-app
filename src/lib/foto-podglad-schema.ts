import { z } from "zod";

export const FOTO_PODGLAD_MAX_BYTES = 10 * 1024 * 1024;

export const fotoPodgladFormSchema = z.object({
  fullName: z.string().trim().min(2, "Podaj imię i nazwisko"),
  email: z.string().trim().email("Podaj poprawny adres e-mail"),
  dogName: z.string().trim().min(1, "Podaj imię psa z zawodów"),
});

export type FotoPodgladFormValues = z.infer<typeof fotoPodgladFormSchema>;

export function isFotoPodgladImageFile(file: File): boolean {
  const mime = file.type || "";
  return mime.startsWith("image/");
}

export function fotoPodgladFileError(file: File | null): string | null {
  if (!file) return "Dodaj zdjęcie psa (JPEG, PNG, WebP lub GIF).";
  if (!isFotoPodgladImageFile(file)) {
    return "Dozwolone są tylko pliki graficzne (JPEG, PNG, WebP, GIF).";
  }
  if (file.size > FOTO_PODGLAD_MAX_BYTES) {
    return "Plik jest za duży — maksymalnie 10 MB.";
  }
  if (file.size < 1) return "Wybrany plik jest pusty.";
  return null;
}
