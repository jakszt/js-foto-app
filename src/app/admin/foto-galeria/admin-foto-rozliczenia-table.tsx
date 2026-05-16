"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import type { FotoRozliczenieAdminRow } from "@/lib/checkout-persistence";

import {
  adminSaveRowDownloadAction,
  adminSaveRowNotesAction,
  type AdminRowSaveState,
} from "./actions";

function fmtPl(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("pl-PL", {
      timeZone: "Europe/Warsaw",
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return "—";
  }
}

function RozliczenieDaneCell({ row }: { row: FotoRozliczenieAdminRow }) {
  return (
    <div className="min-w-[200px] space-y-1 text-left">
      <p className="font-medium text-foreground">{row.full_name}</p>
      <p className="text-muted-foreground">{row.email}</p>
      <p className="text-muted-foreground">
        {row.street}, {row.postal_code} {row.city}
      </p>
      {row.is_company ? (
        <p className="text-xs text-muted-foreground">Firma · NIP {row.nip ?? "—"}</p>
      ) : null}
      {row.infakt_error ? (
        <p className="text-xs text-destructive" title={row.infakt_error}>
          Błąd inFakt
        </p>
      ) : null}
    </div>
  );
}

function NotesCell({
  row,
  adminKey,
}: {
  row: FotoRozliczenieAdminRow;
  adminKey: string;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState<AdminRowSaveState | null, FormData>(
    adminSaveRowNotesAction,
    null
  );

  useEffect(() => {
    if (state?.ok) router.refresh();
  }, [state, router]);

  return (
    <form action={action} className="flex min-w-[220px] flex-col gap-2">
      <input type="hidden" name="adminKey" value={adminKey} />
      <input type="hidden" name="rowId" value={row.id} />
      <textarea
        name="adminNotes"
        rows={4}
        defaultValue={row.admin_notes ?? ""}
        placeholder="Notatka tylko dla Ciebie…"
        className="w-full resize-y rounded-md border border-input bg-background px-2 py-1.5 text-xs"
      />
      <Button type="submit" size="sm" variant="secondary" disabled={pending}>
        {pending ? "Zapis…" : "Zapisz notatkę"}
      </Button>
      {state?.ok === false ? (
        <p className="text-xs text-destructive">{state.error}</p>
      ) : null}
      {state?.ok === true ? <p className="text-xs text-green-700 dark:text-green-400">{state.message}</p> : null}
    </form>
  );
}

function DownloadCell({
  row,
  adminKey,
}: {
  row: FotoRozliczenieAdminRow;
  adminKey: string;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState<AdminRowSaveState | null, FormData>(
    adminSaveRowDownloadAction,
    null
  );

  useEffect(() => {
    if (state?.ok) router.refresh();
  }, [state, router]);

  return (
    <form action={action} className="flex min-w-[200px] flex-col gap-2">
      <input type="hidden" name="adminKey" value={adminKey} />
      <input type="hidden" name="rowId" value={row.id} />
      <input
        name="galleryDownloadUrl"
        type="url"
        defaultValue={row.gallery_download_url ?? ""}
        placeholder="https://… (paczka dla klienta)"
        className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs font-mono"
      />
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Zapis…" : "Zapisz link"}
      </Button>
      {state?.ok === false ? (
        <p className="text-xs text-destructive">{state.error}</p>
      ) : null}
      {state?.ok === true ? <p className="text-xs text-green-700 dark:text-green-400">{state.message}</p> : null}
    </form>
  );
}

function PhotoCell({
  row,
  adminKey,
}: {
  row: FotoRozliczenieAdminRow;
  adminKey: string;
}) {
  const router = useRouter();
  const [preview, setPreview] = useState(row.admin_photo_url);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setPreview(row.admin_photo_url);
  }, [row.admin_photo_url]);

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setErr(null);
    setBusy(true);
    try {
      const fd = new FormData();
      fd.set("adminKey", adminKey);
      fd.set("rowId", row.id);
      fd.set("file", file);
      const res = await fetch("/api/admin/foto-rozliczenie-photo", {
        method: "POST",
        body: fd,
      });
      const json = (await res.json()) as { ok?: boolean; url?: string; error?: string };
      if (!res.ok || !json.ok) {
        setErr(json.error ?? `HTTP ${res.status}`);
        return;
      }
      if (typeof json.url === "string") {
        setPreview(json.url);
        router.refresh();
      }
    } catch {
      setErr("Błąd sieci");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-w-[140px] flex-col items-start gap-2">
      {preview ? (
        // eslint-disable-next-line @next/next/no-img-element -- dynamic admin URL from Storage
        <img
          src={preview}
          alt="Załączone przez admina"
          className="max-h-24 max-w-full rounded-md border border-border object-contain"
        />
      ) : (
        <span className="text-xs text-muted-foreground">Brak zdjęcia</span>
      )}
      <label className="cursor-pointer">
        <span className="inline-flex rounded-md border border-input bg-muted/40 px-2 py-1.5 text-xs font-medium hover:bg-muted">
          {busy ? "Wysyłanie…" : "Wybierz zdjęcie"}
        </span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="sr-only"
          disabled={busy || !adminKey}
          onChange={onFileChange}
        />
      </label>
      {err ? <p className="text-xs text-destructive">{err}</p> : null}
    </div>
  );
}

export function AdminFotoRozliczeniaTable({
  rows,
  adminKey,
}: {
  rows: FotoRozliczenieAdminRow[];
  adminKey: string;
}) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Brak wpisów w tabeli <code className="font-mono">foto_rozliczenia</code>. Po pierwszym
        checkoutcie pojawi się wiersz — pamiętaj o migracjach SQL w{" "}
        <code className="font-mono">supabase/migrations/</code>.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border shadow-sm ring-1 ring-foreground/5">
      <table className="w-full min-w-[1100px] border-collapse text-left text-sm">
        <thead>
          <tr className="sticky top-0 z-[1] border-b border-border bg-muted/80 backdrop-blur-sm">
            <th className="whitespace-nowrap px-3 py-3 font-semibold text-foreground">
              Dane rozliczenia
            </th>
            <th className="whitespace-nowrap px-3 py-3 font-semibold text-foreground">Zdjęć</th>
            <th className="whitespace-nowrap px-3 py-3 font-semibold text-foreground">
              Formularz
            </th>
            <th className="whitespace-nowrap px-3 py-3 font-semibold text-foreground">Opłacono</th>
            <th className="whitespace-nowrap px-3 py-3 font-semibold text-foreground">
              Zdjęcie (admin)
            </th>
            <th className="whitespace-nowrap px-3 py-3 font-semibold text-foreground">Notatki</th>
            <th className="whitespace-nowrap px-3 py-3 font-semibold text-foreground">
              Link paczki (klient)
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              className="border-b border-border align-top odd:bg-card even:bg-muted/15"
            >
              <td className="px-3 py-3">
                <RozliczenieDaneCell row={row} />
              </td>
              <td className="px-3 py-3 tabular-nums text-foreground">{row.photo_count}</td>
              <td className="px-3 py-3 text-muted-foreground">{fmtPl(row.submitted_at)}</td>
              <td className="px-3 py-3 text-muted-foreground">{fmtPl(row.paid_at)}</td>
              <td className="px-3 py-3">
                <PhotoCell row={row} adminKey={adminKey} />
              </td>
              <td className="px-3 py-3">
                <NotesCell row={row} adminKey={adminKey} />
              </td>
              <td className="px-3 py-3">
                <DownloadCell row={row} adminKey={adminKey} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
