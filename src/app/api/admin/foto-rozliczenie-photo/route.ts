import { NextResponse } from "next/server";

import { assertAdminFormKey } from "@/lib/admin-foto-auth";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

const BUCKET = "foto_rozliczenia_admin";
const MAX_BYTES = 15 * 1024 * 1024;

function extFromMime(mime: string): string {
  if (mime === "image/jpeg" || mime === "image/jpg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/gif") return "gif";
  return "bin";
}

export async function POST(req: Request) {
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ ok: false, error: "Oczekiwano multipart/form-data" }, { status: 400 });
  }

  const adminKey = formData.get("adminKey");
  if (!assertAdminFormKey(adminKey)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const rowId = formData.get("rowId");
  const file = formData.get("file");
  if (typeof rowId !== "string" || rowId.length < 1) {
    return NextResponse.json({ ok: false, error: "Brak rowId" }, { status: 422 });
  }
  if (!(file instanceof File) || file.size < 1) {
    return NextResponse.json({ ok: false, error: "Brak pliku" }, { status: 422 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { ok: false, error: "Plik za duży (max 15 MB)" },
      { status: 422 }
    );
  }
  const mime = file.type || "application/octet-stream";
  if (!mime.startsWith("image/")) {
    return NextResponse.json(
      { ok: false, error: "Dozwolone są tylko obrazy (JPEG, PNG, WebP, GIF)" },
      { status: 422 }
    );
  }

  const supabase = createSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json(
      { ok: false, error: "Brak konfiguracji Supabase" },
      { status: 503 }
    );
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const ext = extFromMime(mime);
  const objectPath = `${rowId}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;

  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(objectPath, buf, {
      contentType: mime,
      upsert: true,
    });

  if (upErr) {
    console.error("[admin-photo-upload]", upErr);
    return NextResponse.json(
      {
        ok: false,
        error: `Upload Storage: ${upErr.message}. Utwórz bucket „${BUCKET}” (publiczny odczyt) w Supabase Storage.`,
      },
      { status: 502 }
    );
  }

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(objectPath);
  const publicUrl = pub.publicUrl;

  const { error: dbErr } = await supabase
    .from("foto_rozliczenia")
    .update({ admin_photo_url: publicUrl })
    .eq("id", rowId);

  if (dbErr) {
    return NextResponse.json(
      { ok: false, error: `Baza: ${dbErr.message}` },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true, url: publicUrl });
}
