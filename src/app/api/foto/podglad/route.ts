import { NextResponse } from "next/server";

import { validateCheckoutAntiBot } from "@/lib/checkout-anti-bot";
import {
  buildFotoPodgladConfirmationEmail,
  buildFotoPodgladNotifyEmail,
  FOTO_PODGLAD_OWNER_EMAIL,
} from "@/lib/foto-podglad-email";
import {
  fotoPodgladFileError,
  fotoPodgladFormSchema,
  isFotoPodgladImageFile,
} from "@/lib/foto-podglad-schema";
import {
  isMailjetSendConfigured,
  sendMailjetMessage,
  type MailjetAttachment,
} from "@/lib/mailjet";

export const runtime = "nodejs";

const NOTIFY_EMAIL =
  process.env.FOTO_PODGLAD_NOTIFY_EMAIL?.trim() || FOTO_PODGLAD_OWNER_EMAIL;

function safeFilename(name: string): string {
  const base = name.replace(/[^\w.\-() ]+/g, "_").slice(0, 120);
  return base.length > 0 ? base : "zdjecie-psa.jpg";
}

export async function POST(req: Request) {
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "Oczekiwano formularza z załącznikiem." },
      { status: 400 }
    );
  }

  const venueUrl = formData.get("venueUrl");
  const formStartedAtRaw = formData.get("formStartedAt");
  const formStartedAt =
    typeof formStartedAtRaw === "string"
      ? Number(formStartedAtRaw)
      : formStartedAtRaw;

  const antiBot = validateCheckoutAntiBot({
    venueUrl: typeof venueUrl === "string" ? venueUrl : "",
    formStartedAt,
  });
  if (!antiBot.ok) {
    return NextResponse.json({ error: antiBot.message }, { status: antiBot.status });
  }

  const parsed = fotoPodgladFormSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    dogName: formData.get("dogName"),
  });
  if (!parsed.success) {
    const first = parsed.error.issues[0]?.message ?? "Sprawdź pola formularza.";
    return NextResponse.json({ error: first }, { status: 422 });
  }

  const photo = formData.get("photo");
  if (!(photo instanceof File)) {
    return NextResponse.json(
      { error: "Dodaj zdjęcie psa (JPEG, PNG, WebP lub GIF)." },
      { status: 422 }
    );
  }

  const fileErr = fotoPodgladFileError(photo);
  if (fileErr) {
    return NextResponse.json({ error: fileErr }, { status: 422 });
  }
  if (!isFotoPodgladImageFile(photo)) {
    return NextResponse.json(
      { error: "Dozwolone są tylko pliki graficzne." },
      { status: 422 }
    );
  }

  if (!isMailjetSendConfigured()) {
    console.error("[foto-podglad] Mailjet nie jest skonfigurowany");
    return NextResponse.json(
      {
        error:
          "Wysyłka formularza jest chwilowo niedostępna. Napisz na jakub.sztuba@gmail.com.",
      },
      { status: 503 }
    );
  }

  const buf = Buffer.from(await photo.arrayBuffer());
  const mime = photo.type || "image/jpeg";
  const filename = safeFilename(photo.name || "zdjecie-psa.jpg");
  const attachment: MailjetAttachment = {
    ContentType: mime,
    Filename: filename,
    Base64Content: buf.toString("base64"),
  };

  const { fullName, email, dogName } = parsed.data;
  const notifyMail = buildFotoPodgladNotifyEmail({
    fullName,
    email,
    dogName,
    photoFilename: filename,
  });

  const notifySend = await sendMailjetMessage({
    to: [{ email: NOTIFY_EMAIL, name: "Jakub Sztuba" }],
    subject: notifyMail.subject,
    textPart: notifyMail.textPart,
    htmlPart: notifyMail.htmlPart,
    customId: "foto_podglad_request",
    attachments: [attachment],
  });

  if (!notifySend.ok) {
    console.error("[foto-podglad] Mailjet notify:", notifySend.error);
    return NextResponse.json(
      { error: "Nie udało się wysłać formularza. Spróbuj ponownie za chwilę." },
      { status: 502 }
    );
  }

  const confirmMail = buildFotoPodgladConfirmationEmail({ fullName });
  const confirmSend = await sendMailjetMessage({
    to: [{ email, name: fullName }],
    subject: confirmMail.subject,
    textPart: confirmMail.textPart,
    htmlPart: confirmMail.htmlPart,
    customId: "foto_podglad_confirmation",
  });

  if (!confirmSend.ok) {
    console.error("[foto-podglad] Mailjet confirmation:", confirmSend.error);
    return NextResponse.json(
      {
        error:
          "Zgłoszenie dotarło, ale nie udało się wysłać potwierdzenia na e-mail. Napisz na jakub.sztuba@gmail.com.",
      },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true });
}
