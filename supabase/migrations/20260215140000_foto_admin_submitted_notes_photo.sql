-- Data wysłania formularza, notatki admina, zdjęcie referencyjne (URL po uploadzie do Storage).
-- Bucket Storage (Dashboard → Storage): utwórz publiczny bucket „foto_rozliczenia_admin”
-- (albo prywatny — wtedy trzeba by generować signed URL w kodzie).

alter table public.foto_rozliczenia
  add column if not exists submitted_at timestamptz,
  add column if not exists admin_notes text,
  add column if not exists admin_photo_url text;

comment on column public.foto_rozliczenia.submitted_at is 'Czas wysłania formularza rozliczenia (checkout)';
comment on column public.foto_rozliczenia.admin_notes is 'Notatka tylko w panelu admina';
comment on column public.foto_rozliczenia.admin_photo_url is 'Publiczny URL zdjęcia z panelu (Supabase Storage)';
