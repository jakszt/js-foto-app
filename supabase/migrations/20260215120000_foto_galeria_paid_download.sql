-- Uruchom w Supabase → SQL Editor (lub migracje), jeśli tabela już istnieje.
-- Tabela: foto_rozliczenia (jak w aplikacji).

alter table public.foto_rozliczenia
  add column if not exists paid_at timestamptz,
  add column if not exists gallery_download_url text;

comment on column public.foto_rozliczenia.paid_at is 'Czas zaksięgowania płatności (webhook invoice_paid) — deadline galerii = paid_at + 24h';
comment on column public.foto_rozliczenia.gallery_download_url is 'Link do paczki zdjęć ustawiany ręcznie w panelu admina';

create index if not exists foto_rozliczenia_email_paid_idx
  on public.foto_rozliczenia (email)
  where paid_at is not null;
