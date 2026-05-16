/** Weryfikacja klucza z formularza / API admina (ADMIN_EMAIL_PREVIEW_SECRET). */
export function assertAdminFormKey(key: unknown): key is string {
  const secret = process.env.ADMIN_EMAIL_PREVIEW_SECRET?.trim();
  if (!secret) return true;
  return typeof key === "string" && key === secret;
}
