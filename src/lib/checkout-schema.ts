import { z } from "zod";

const plPostal = /^\d{2}-\d{3}$/;

function nipDigits(nip: string): string {
  return nip.replace(/\D/g, "");
}

/** uproszczona walidacja NIP (10 cyfr) */
function isValidNipFormat(nip: string): boolean {
  const d = nipDigits(nip);
  if (d.length !== 10) return false;
  const weights = [6, 5, 7, 2, 3, 4, 5, 6, 7];
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(d[i]!, 10) * weights[i]!;
  const checksum = sum % 11;
  const c = checksum === 10 ? 0 : checksum;
  return c === parseInt(d[9]!, 10);
}

export const checkoutFormSchema = z
  .object({
    fullName: z.string().trim().min(2, "Podaj imię i nazwisko"),
    email: z.string().trim().email("Podaj poprawny adres e-mail"),
    street: z.string().trim().min(2, "Podaj ulicę i numer"),
    postalCode: z
      .string()
      .trim()
      .regex(plPostal, "Kod pocztowy: format 00-000"),
    city: z.string().trim().min(2, "Podaj miasto"),
    isCompany: z.boolean(),
    nip: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.isCompany) return;
    const raw = data.nip?.trim() ?? "";
    if (!raw) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Podaj NIP",
        path: ["nip"],
      });
      return;
    }
    if (!isValidNipFormat(raw)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Nieprawidłowy numer NIP",
        path: ["nip"],
      });
    }
  });

export type CheckoutFormValues = z.infer<typeof checkoutFormSchema>;
