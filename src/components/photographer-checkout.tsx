"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Camera, CalendarDays, Images, Loader2, Minus, Plus } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Controller, useForm, useWatch } from "react-hook-form";
import posthog from "posthog-js";

import { DogPhotoDropzone } from "@/components/dog-photo-dropzone";
import { FloatingField } from "@/components/floating-field";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  checkoutFormSchema,
  type CheckoutFormValues,
} from "@/lib/checkout-schema";
import {
  checkoutStepFromPathname,
  FOTO_PATH,
  FOTO_PODGLAD_PATH,
  FOTO_ROZLICZENIE_PATH,
  FOTO_UMOW_SIE_PATH,
} from "@/lib/foto-routes";
import {
  fotoPodgladFileError,
  fotoPodgladFormSchema,
  type FotoPodgladFormValues,
} from "@/lib/foto-podglad-schema";
import {
  billablePhotoCount,
  formatPln,
  PHOTO_COUNT_MAX,
  PHOTO_COUNT_MIN,
  PHOTO_GROSS_PLN,
  totalGrossPln,
} from "@/lib/photo-checkout-pricing";
import { cn } from "@/lib/utils";

const GOOGLE_BOOKING_IFRAME_SRC =
  "https://calendar.google.com/calendar/appointments/schedules/AcZssZ2xWPDJbzLQyJba_ZPPei1f80ldgfA3svVG_qweYkROYefo6aPkAUDnhWZxPAuXSQNNWI67WayH?gv=true";

type Step = "tiles" | "preview" | "booking" | "billing" | "paying";

const podgladDefaultValues: FotoPodgladFormValues = {
  fullName: "",
  email: "",
  dogName: "",
};

const defaultValues: CheckoutFormValues = {
  photoCount: 1,
  fullName: "",
  email: "",
  street: "",
  postalCode: "",
  city: "",
  isCompany: false,
  nip: "",
};

function gratisPhotosUpperWord(count: number): string {
  if (count === 1) return "ZDJĘCIE";
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return "ZDJĘCIA";
  }
  return "ZDJĘĆ";
}

function isFormComplete(values: CheckoutFormValues): boolean {
  const n = values.photoCount;
  if (
    typeof n !== "number" ||
    !Number.isInteger(n) ||
    n < PHOTO_COUNT_MIN ||
    n > PHOTO_COUNT_MAX
  ) {
    return false;
  }
  const base =
    values.fullName.trim().length >= 2 &&
    values.email.includes("@") &&
    values.street.trim().length >= 2 &&
    /^\d{2}-\d{3}$/.test(values.postalCode.trim()) &&
    values.city.trim().length >= 2;
  if (!values.isCompany) return base;
  const nip = values.nip?.replace(/\D/g, "") ?? "";
  return base && nip.length === 10;
}

export function PhotographerCheckout() {
  const pathname = usePathname();
  const router = useRouter();
  const [paying, setPaying] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [previewPhoto, setPreviewPhoto] = useState<File | null>(null);
  const [previewPhotoError, setPreviewPhotoError] = useState<string | null>(null);
  const [previewSubmitting, setPreviewSubmitting] = useState(false);
  const [previewSubmitted, setPreviewSubmitted] = useState(false);
  const billingOpenedAtRef = useRef<number | null>(null);
  const previewOpenedAtRef = useRef<number | null>(null);
  const honeypotRef = useRef<HTMLInputElement>(null);
  const previewHoneypotRef = useRef<HTMLInputElement>(null);

  const routeStep = checkoutStepFromPathname(pathname);
  const step: Step = paying ? "paying" : routeStep;

  const form = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutFormSchema),
    defaultValues,
    mode: "onChange",
  });

  const podgladForm = useForm<FotoPodgladFormValues>({
    resolver: zodResolver(fotoPodgladFormSchema),
    defaultValues: podgladDefaultValues,
    mode: "onChange",
  });

  const watched = useWatch({ control: form.control });
  const photoCount =
    typeof watched?.photoCount === "number"
      ? watched.photoCount
      : defaultValues.photoCount;
  const totalBrutto = totalGrossPln(photoCount);
  const billablePhotos = billablePhotoCount(photoCount);
  const freePhotos = photoCount - billablePhotos;
  const complete = useMemo(() => {
    const merged = { ...defaultValues, ...watched } as CheckoutFormValues;
    return isFormComplete(merged);
  }, [watched]);

  const podgladWatched = useWatch({ control: podgladForm.control });
  const podgladComplete = useMemo(() => {
    const merged = {
      ...podgladDefaultValues,
      ...podgladWatched,
    } as FotoPodgladFormValues;
    return (
      fotoPodgladFormSchema.safeParse(merged).success &&
      fotoPodgladFileError(previewPhoto) === null
    );
  }, [podgladWatched, previewPhoto]);

  useEffect(() => {
    if (routeStep !== "preview") {
      previewOpenedAtRef.current = null;
      return;
    }
    if (previewOpenedAtRef.current == null) {
      previewOpenedAtRef.current = Date.now();
    }
  }, [routeStep]);

  useEffect(() => {
    if (routeStep !== "preview") {
      setPreviewSubmitted(false);
      setPreviewPhoto(null);
      setPreviewPhotoError(null);
      setApiError(null);
      podgladForm.reset(podgladDefaultValues);
    }
  }, [routeStep]);

  useEffect(() => {
    if (paying || routeStep !== "billing") return;
    if (billingOpenedAtRef.current == null) {
      billingOpenedAtRef.current = Date.now();
    }
  }, [paying, routeStep]);

  useEffect(() => {
    if (!paying) return;
    if (checkoutStepFromPathname(pathname) !== "billing") {
      setPaying(false);
    }
  }, [paying, pathname]);

  async function onPay(values: CheckoutFormValues) {
    setApiError(null);
    setPaying(true);

    posthog.identify(values.email);
    posthog.capture("checkout_payment_submitted", {
      is_company: values.isCompany,
          photo_count: values.photoCount,
          billable_photo_count: billablePhotoCount(values.photoCount),
    });

    try {
      const formStartedAt = billingOpenedAtRef.current ?? Date.now();
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-POSTHOG-DISTINCT-ID": posthog.get_distinct_id(),
          "X-POSTHOG-SESSION-ID": posthog.get_session_id() ?? "",
        },
        body: JSON.stringify({
          ...values,
          nip: values.isCompany ? values.nip : undefined,
          venueUrl: honeypotRef.current?.value ?? "",
          formStartedAt,
        }),
      });
      const raw = await res.text();
      const trimmed = raw.trim();
      let data: { paymentUrl?: string; error?: string };
      if (trimmed) {
        try {
          data = JSON.parse(trimmed) as { paymentUrl?: string; error?: string };
        } catch {
          throw new Error(
            `Serwer zwrócił odpowiedź, której nie da się odczytać (HTTP ${res.status}). Spróbuj ponownie.`
          );
        }
      } else {
        throw new Error(
          res.ok
            ? "Serwer zwrócił pustą odpowiedź — odśwież stronę i spróbuj ponownie."
            : `Żądanie nie powiodło się (HTTP ${res.status}). Spróbuj ponownie.`
        );
      }
      if (!res.ok || !data.paymentUrl) {
        throw new Error(data.error ?? "Nie udało się przygotować płatności");
      }
      window.location.assign(data.paymentUrl);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Wystąpił błąd";
      posthog.capture("checkout_payment_error", { error: message });
      posthog.captureException(e);
      setApiError(message);
      setPaying(false);
    }
  }

  function goToFotoTiles() {
    setPaying(false);
    router.push(FOTO_PATH);
  }

  async function onSubmitPodglad(values: FotoPodgladFormValues) {
    setApiError(null);
    const fileErr = fotoPodgladFileError(previewPhoto);
    if (fileErr) {
      setPreviewPhotoError(fileErr);
      return;
    }
    setPreviewPhotoError(null);
    setPreviewSubmitting(true);

    posthog.identify(values.email);
    posthog.capture("foto_podglad_submitted", {
      dog_name_length: values.dogName.length,
    });

    try {
      const fd = new FormData();
      fd.set("fullName", values.fullName);
      fd.set("email", values.email);
      fd.set("dogName", values.dogName);
      fd.set("photo", previewPhoto!);
      fd.set("venueUrl", previewHoneypotRef.current?.value ?? "");
      fd.set(
        "formStartedAt",
        String(previewOpenedAtRef.current ?? Date.now())
      );

      const res = await fetch("/api/foto/podglad", {
        method: "POST",
        body: fd,
      });
      const raw = await res.text();
      let data: { ok?: boolean; error?: string };
      if (raw.trim()) {
        try {
          data = JSON.parse(raw) as { ok?: boolean; error?: string };
        } catch {
          throw new Error(
            `Serwer zwrócił odpowiedź, której nie da się odczytać (HTTP ${res.status}).`
          );
        }
      } else {
        data = {};
      }
      if (!res.ok) {
        throw new Error(data.error ?? `Żądanie nie powiodło się (HTTP ${res.status}).`);
      }
      posthog.capture("foto_podglad_success");
      setPreviewSubmitted(true);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Wystąpił błąd";
      posthog.capture("foto_podglad_error", { error: message });
      posthog.captureException(e);
      setApiError(message);
    } finally {
      setPreviewSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-4 py-14 sm:px-6">
      <header className="space-y-2 text-center sm:text-left">
        <p className="text-[1.05rem] font-normal text-foreground/80">hej! tu</p>
        <h1 className="text-4xl font-bold leading-[0.95] tracking-[-0.04em] sm:text-5xl">
          <span className="text-[color-mix(in_oklab,var(--accent)_92%,var(--foreground))]">
            Jakub
          </span>{" "}
          Sztuba
        </h1>
        <p className="max-w-xl text-sm text-muted-foreground sm:text-base">
          Szukasz dobrych kadrów? Wybierz opcję:
        </p>
      </header>

      {step === "tiles" ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Link
            href={FOTO_PODGLAD_PATH}
            onClick={() => {
              posthog.capture("foto_podglad_opened");
            }}
            className={cn(
              "group rounded-xl text-left transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklab,var(--accent)_45%,transparent)] focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:col-span-2"
            )}
          >
            <Card className="h-full border border-transparent bg-card/90 shadow-sm ring-1 ring-foreground/10 transition-[box-shadow,ring-color] duration-200 group-hover:shadow-md group-hover:ring-[color-mix(in_oklab,var(--accent)_35%,var(--foreground))]/25">
              <CardHeader>
                <div className="mb-1 flex size-11 items-center justify-center rounded-lg bg-[color-mix(in_oklab,var(--accent)_14%,transparent)] text-[color-mix(in_oklab,var(--accent)_88%,var(--foreground))]">
                  <Images className="size-5" aria-hidden />
                </div>
                <CardTitle className="text-lg">Chcę zobaczyć zdjęcia!</CardTitle>
                <CardDescription>
                  Byłeś/aś na Latających Psach w Poznaniu? Wypełnij formularz, a
                  bezpłatnie prześlę Ci podgląd zdjęć.
                </CardDescription>
              </CardHeader>
              <CardFooter className="text-sm font-medium text-[color-mix(in_oklab,var(--accent)_78%,var(--foreground))]">
                Wypełnij formularz →
              </CardFooter>
            </Card>
          </Link>

          <Link
            href={FOTO_ROZLICZENIE_PATH}
            onClick={() => {
              posthog.capture("checkout_session_started");
            }}
            className={cn(
              "group rounded-xl text-left transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklab,var(--accent)_45%,transparent)] focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            )}
          >
            <Card className="h-full border border-transparent bg-card/90 shadow-sm ring-1 ring-foreground/10 transition-[box-shadow,ring-color] duration-200 group-hover:shadow-md group-hover:ring-[color-mix(in_oklab,var(--accent)_35%,var(--foreground))]/25">
              <CardHeader>
                <div className="mb-1 flex size-11 items-center justify-center rounded-lg bg-[color-mix(in_oklab,var(--accent)_14%,transparent)] text-[color-mix(in_oklab,var(--accent)_88%,var(--foreground))]">
                  <Camera className="size-5" aria-hidden />
                </div>
                <CardTitle className="text-lg">Jestem po sesji</CardTitle>
                <CardDescription>
                  Opłać zdjęcia online przez BLIK lub Twój bank.
                </CardDescription>
              </CardHeader>
              <CardFooter className="text-sm font-medium text-[color-mix(in_oklab,var(--accent)_78%,var(--foreground))]">
                Rozpocznij →
              </CardFooter>
            </Card>
          </Link>

          <Link
            href={FOTO_UMOW_SIE_PATH}
            onClick={() => {
              posthog.capture("checkout_booking_opened");
            }}
            className={cn(
              "group rounded-xl text-left transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklab,var(--accent)_45%,transparent)] focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            )}
          >
            <Card className="h-full border border-transparent bg-card/90 shadow-sm ring-1 ring-foreground/10 transition-[box-shadow,ring-color] duration-200 group-hover:shadow-md group-hover:ring-[color-mix(in_oklab,var(--accent)_35%,var(--foreground))]/25">
              <CardHeader>
                <div className="mb-1 flex size-11 items-center justify-center rounded-lg bg-[color-mix(in_oklab,var(--accent)_14%,transparent)] text-[color-mix(in_oklab,var(--accent)_88%,var(--foreground))]">
                  <CalendarDays className="size-5" aria-hidden />
                </div>
                <CardTitle className="text-lg">Chcę umówić sesję</CardTitle>
                <CardDescription>
                  Otwórz kalendarz rezerwacji — wybierz termin, potwierdzenie wyśle Google Calendar.
                </CardDescription>
              </CardHeader>
              <CardFooter className="text-sm font-medium text-[color-mix(in_oklab,var(--accent)_78%,var(--foreground))]">
                Umów termin →
              </CardFooter>
            </Card>
          </Link>
        </div>
      ) : null}

      {step === "preview" ? (
        <Card className="border border-transparent shadow-md ring-1 ring-foreground/10">
          <CardHeader className="space-y-4">
            <Button
              type="button"
              variant="ghost"
              className="w-fit -translate-x-2 text-muted-foreground"
              onClick={() => {
                posthog.capture("foto_podglad_back");
                goToFotoTiles();
              }}
            >
              ← Wróć
            </Button>
            <div className="space-y-1.5">
              <div className="flex items-center gap-3">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-[color-mix(in_oklab,var(--accent)_14%,transparent)] text-[color-mix(in_oklab,var(--accent)_88%,var(--foreground))]">
                  <Images className="size-5" aria-hidden />
                </div>
                <CardTitle className="text-xl">Chcę zobaczyć zdjęcia!</CardTitle>
              </div>
              <CardDescription className="text-base">
                Byłeś/aś na Latających Psach w Poznaniu? Wypełnij formularz — prześlę
                bezpłatny podgląd kadrów z wydarzenia.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {previewSubmitted ? (
              <div className="space-y-4 rounded-lg border border-[color-mix(in_oklab,var(--accent)_25%,var(--border))] bg-[color-mix(in_oklab,var(--accent)_8%,var(--card))] px-4 py-6 text-center">
                <p className="text-base font-medium text-foreground">
                  Dziękuję za zgłoszenie!
                </p>
                <p className="text-sm text-muted-foreground">
                  Wysłałem potwierdzenie na Twój e-mail. Odezwę się z podglądem zdjęć tak
                  szybko, jak to możliwe — zwykle w ciągu kilku dni.
                </p>
                <Button type="button" variant="outline" onClick={goToFotoTiles}>
                  Wróć do opcji
                </Button>
              </div>
            ) : (
              <form
                className="relative space-y-5"
                onSubmit={podgladForm.handleSubmit(onSubmitPodglad)}
                noValidate
              >
                <div
                  className="pointer-events-none absolute -left-[10000px] h-px w-px overflow-hidden opacity-0"
                  aria-hidden="true"
                >
                  <label htmlFor="podglad-venue-url">Strona WWW firmy</label>
                  <input
                    ref={previewHoneypotRef}
                    id="podglad-venue-url"
                    type="text"
                    name="venueUrl"
                    tabIndex={-1}
                    autoComplete="off"
                    defaultValue=""
                  />
                </div>

                <FloatingField
                  label="Twoje imię i nazwisko"
                  autoComplete="name"
                  {...podgladForm.register("fullName")}
                  aria-invalid={!!podgladForm.formState.errors.fullName}
                />
                {podgladForm.formState.errors.fullName ? (
                  <p className="-mt-3 text-xs text-destructive">
                    {podgladForm.formState.errors.fullName.message}
                  </p>
                ) : null}

                <FloatingField
                  label="E-mail"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  {...podgladForm.register("email")}
                  aria-invalid={!!podgladForm.formState.errors.email}
                />
                {podgladForm.formState.errors.email ? (
                  <p className="-mt-3 text-xs text-destructive">
                    {podgladForm.formState.errors.email.message}
                  </p>
                ) : null}

                <FloatingField
                  label="Imię psa z zawodów"
                  autoComplete="off"
                  {...podgladForm.register("dogName")}
                  aria-invalid={!!podgladForm.formState.errors.dogName}
                />
                {podgladForm.formState.errors.dogName ? (
                  <p className="-mt-3 text-xs text-destructive">
                    {podgladForm.formState.errors.dogName.message}
                  </p>
                ) : null}

                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">
                    Dodaj zdjęcie psa, abym łatwiej rozpoznał modela lub modelkę :)
                  </p>
                  <DogPhotoDropzone
                    value={previewPhoto}
                    onChange={(file) => {
                      setPreviewPhoto(file);
                      setPreviewPhotoError(
                        file ? fotoPodgladFileError(file) : null
                      );
                    }}
                    error={previewPhotoError}
                    disabled={previewSubmitting}
                  />
                </div>

                {apiError ? (
                  <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                    {apiError}
                  </p>
                ) : null}

                <Button
                  type="submit"
                  size="lg"
                  disabled={!podgladComplete || previewSubmitting}
                  className={cn(
                    "h-auto min-h-12 w-full py-4 text-base font-semibold tracking-wide transition-[transform,box-shadow,opacity] duration-300",
                    podgladComplete
                      ? "bg-[color-mix(in_oklab,var(--accent)_92%,white)] text-[#2a241c] shadow-[0_10px_40px_-18px_color-mix(in_oklab,var(--accent)_55%,transparent)] hover:bg-[color-mix(in_oklab,var(--accent)_82%,white)]"
                      : "opacity-40"
                  )}
                >
                  {previewSubmitting ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                      Wysyłanie…
                    </>
                  ) : (
                    "Wyślij zgłoszenie"
                  )}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      ) : null}

      {step === "booking" ? (
        <Card className="overflow-hidden border border-transparent shadow-md ring-1 ring-foreground/10">
          <CardHeader className="space-y-4">
            <Button
              type="button"
              variant="ghost"
              className="w-fit -translate-x-2 text-muted-foreground"
              onClick={() => {
                posthog.capture("checkout_booking_back");
                goToFotoTiles();
              }}
            >
              ← Wróć
            </Button>
            <div className="space-y-1.5">
              <div className="flex items-center gap-3">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-[color-mix(in_oklab,var(--accent)_14%,transparent)] text-[color-mix(in_oklab,var(--accent)_88%,var(--foreground))]">
                  <CalendarDays className="size-5" aria-hidden />
                </div>
                <CardTitle className="text-xl">Umów sesję</CardTitle>
              </div>
              <CardDescription className="text-base">
                Wybierz dogodny slot poniżej — po zapisie dostaniesz wiadomość z potwierdzeniem.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="px-0 pb-0 pt-0 sm:px-6 sm:pb-6">
            <div className="overflow-hidden border-t border-border bg-card sm:rounded-xl sm:border sm:shadow-sm sm:ring-1 sm:ring-foreground/10">
              <iframe
                title="Umów sesję — Google Calendar"
                src={GOOGLE_BOOKING_IFRAME_SRC}
                className="block min-h-[600px] w-full border-0"
                width="100%"
                height={600}
                loading="lazy"
              />
            </div>
          </CardContent>
        </Card>
      ) : null}

      {step === "billing" ? (
        <Card className="border border-transparent shadow-md ring-1 ring-foreground/10">
          <CardHeader className="space-y-4">
            <Button
              type="button"
              variant="ghost"
              className="w-fit -translate-x-2 text-muted-foreground"
              onClick={() => {
                setApiError(null);
                posthog.capture("checkout_back_clicked");
                goToFotoTiles();
              }}
            >
              ← Wróć
            </Button>
            <CardTitle className="text-xl">Dane rozliczeniowe</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="relative space-y-5"
              onSubmit={form.handleSubmit(onPay)}
              noValidate
            >
              <div
                className="pointer-events-none absolute -left-[10000px] h-px w-px overflow-hidden opacity-0"
                aria-hidden="true"
              >
                <label htmlFor="checkout-venue-url">Strona WWW firmy</label>
                <input
                  ref={honeypotRef}
                  id="checkout-venue-url"
                  type="text"
                  name="venueUrl"
                  tabIndex={-1}
                  autoComplete="off"
                  defaultValue=""
                />
              </div>

              <FloatingField
                label="Imię i nazwisko"
                autoComplete="name"
                {...form.register("fullName")}
                aria-invalid={!!form.formState.errors.fullName}
              />
              {form.formState.errors.fullName ? (
                <p className="-mt-3 text-xs text-destructive">
                  {form.formState.errors.fullName.message}
                </p>
              ) : null}

              <FloatingField
                label="E-mail"
                type="email"
                inputMode="email"
                autoComplete="email"
                {...form.register("email")}
                aria-invalid={!!form.formState.errors.email}
              />
              {form.formState.errors.email ? (
                <p className="-mt-3 text-xs text-destructive">
                  {form.formState.errors.email.message}
                </p>
              ) : null}

              <FloatingField
                label="Ulica i numer"
                autoComplete="street-address"
                {...form.register("street")}
                aria-invalid={!!form.formState.errors.street}
              />
              {form.formState.errors.street ? (
                <p className="-mt-3 text-xs text-destructive">
                  {form.formState.errors.street.message}
                </p>
              ) : null}

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <FloatingField
                    label="Kod pocztowy"
                    inputMode="numeric"
                    autoComplete="postal-code"
                    {...form.register("postalCode")}
                    aria-invalid={!!form.formState.errors.postalCode}
                    hint="Format 00-000"
                  />
                  {form.formState.errors.postalCode ? (
                    <p className="mt-1 text-xs text-destructive">
                      {form.formState.errors.postalCode.message}
                    </p>
                  ) : null}
                </div>
                <div>
                  <FloatingField
                    label="Miasto"
                    autoComplete="address-level2"
                    {...form.register("city")}
                    aria-invalid={!!form.formState.errors.city}
                  />
                  {form.formState.errors.city ? (
                    <p className="mt-1 text-xs text-destructive">
                      {form.formState.errors.city.message}
                    </p>
                  ) : null}
                </div>
              </div>

              <Controller
                control={form.control}
                name="photoCount"
                render={({ field }) => (
                  <div className="rounded-xl border border-border/80 bg-muted/20 px-4 py-4">
                    <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <span
                        id="photo-count-label"
                        className="text-sm font-medium text-foreground"
                      >
                        Ile zdjęć kupujesz?
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {PHOTO_GROSS_PLN} zł brutto / szt. płatna (VAT 23%). Promocja 3+1: co 4.
                        zdjęcie gratis.
                      </span>
                    </div>
                    <div
                      className="flex items-center justify-center gap-3 sm:justify-start"
                      role="group"
                      aria-labelledby="photo-count-label"
                      aria-describedby="photo-count-stepper-desc"
                    >
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="size-11 shrink-0 rounded-full border-foreground/15 shadow-sm"
                        aria-label="Mniej zdjęć"
                        disabled={field.value <= PHOTO_COUNT_MIN}
                        onClick={() =>
                          field.onChange(
                            Math.max(PHOTO_COUNT_MIN, field.value - 1)
                          )
                        }
                      >
                        <Minus className="size-4" aria-hidden />
                      </Button>
                      <span
                        id="photo-count-value"
                        className="min-w-[3.5rem] text-center text-2xl font-semibold tabular-nums tracking-tight text-foreground"
                        aria-live="polite"
                        aria-atomic="true"
                      >
                        {field.value}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="size-11 shrink-0 rounded-full border-foreground/15 shadow-sm"
                        aria-label="Więcej zdjęć"
                        disabled={field.value >= PHOTO_COUNT_MAX}
                        onClick={() =>
                          field.onChange(
                            Math.min(PHOTO_COUNT_MAX, field.value + 1)
                          )
                        }
                      >
                        <Plus className="size-4" aria-hidden />
                      </Button>
                    </div>
                    <p id="photo-count-stepper-desc" className="sr-only">
                      Liczba zdjęć od {PHOTO_COUNT_MIN} do {PHOTO_COUNT_MAX}. Promocja 3+1: co
                      czwarte zdjęcie w zamówieniu jest gratis; płatna sztuka {PHOTO_GROSS_PLN} zł
                      brutto.
                    </p>
                    {form.formState.errors.photoCount ? (
                      <p className="mt-2 text-xs text-destructive">
                        {form.formState.errors.photoCount.message}
                      </p>
                    ) : null}
                  </div>
                )}
              />

              <Controller
                control={form.control}
                name="isCompany"
                render={({ field }) => (
                  <label className="flex cursor-pointer select-none flex-wrap items-center gap-3 rounded-lg border border-border/80 bg-muted/30 px-3 py-3">
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={(v) => field.onChange(v === true)}
                    />
                    <span className="text-sm font-medium leading-snug">
                      Faktura na firmę
                    </span>
                  </label>
                )}
              />

              {form.watch("isCompany") ? (
                <FloatingField
                  label="NIP"
                  inputMode="numeric"
                  autoComplete="off"
                  {...form.register("nip")}
                  aria-invalid={!!form.formState.errors.nip}
                  hint="10 cyfr, z walidacją sumy kontrolnej"
                />
              ) : null}
              {form.formState.errors.nip ? (
                <p className="-mt-3 text-xs text-destructive">
                  {form.formState.errors.nip.message}
                </p>
              ) : null}

              <div
                className="flex flex-col gap-2 rounded-lg border border-[color-mix(in_oklab,var(--accent)_25%,var(--border))] bg-[color-mix(in_oklab,var(--accent)_8%,var(--card))] px-4 py-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4"
                aria-live="polite"
              >
                <div className="flex flex-col gap-0.5 text-sm text-muted-foreground">
                  {freePhotos > 0 ? (
                    <>
                      <span>
                        {billablePhotos} × {PHOTO_GROSS_PLN} zł brutto
                      </span>
                      <span className="font-semibold uppercase tracking-wide text-foreground">
                        + {freePhotos} {gratisPhotosUpperWord(freePhotos)} GRATIS
                      </span>
                    </>
                  ) : (
                    <span>
                      {photoCount} × {PHOTO_GROSS_PLN} zł brutto
                    </span>
                  )}
                </div>
                <span className="text-lg font-bold tabular-nums text-foreground sm:shrink-0">
                  Razem {formatPln(totalBrutto)}
                </span>
              </div>

              {apiError ? (
                <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                  {apiError}
                </p>
              ) : null}

              <div className="w-full pt-2">
                <Button
                  type="submit"
                  size="lg"
                  disabled={!complete || form.formState.isSubmitting}
                  className={cn(
                    "h-auto min-h-12 w-full py-4 text-base font-semibold tracking-wide transition-[transform,box-shadow,opacity,filter] duration-300",
                    complete
                      ? "bg-[color-mix(in_oklab,var(--accent)_92%,white)] text-[#2a241c] shadow-[0_10px_40px_-18px_color-mix(in_oklab,var(--accent)_55%,transparent)] hover:bg-[color-mix(in_oklab,var(--accent)_82%,white)]"
                      : "opacity-40 grayscale-[0.35] shadow-none"
                  )}
                >
                  OPŁAĆ ZDJĘCIA
                </Button>
              </div>

              <div
                className="mt-5 flex flex-col items-center gap-3 border-t border-border/70 pt-5"
                aria-label="Dostawcy płatności"
              >
                <p className="text-center text-[11px] leading-snug text-muted-foreground sm:text-xs">
                  Bezpieczną i szybką płatność obsługują:
                </p>
                <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
                  {/* eslint-disable-next-line @next/next/no-img-element -- małe logotypy z /public */}
                  <img
                    src="/infakt-logo.png"
                    alt="inFakt"
                    width={120}
                    height={36}
                    className="h-7 w-auto max-w-[min(44vw,140px)] object-contain object-center"
                    loading="lazy"
                    decoding="async"
                  />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/autopay-logo.svg"
                    alt="Autopay"
                    width={142}
                    height={36}
                    className="h-6 w-auto max-w-[min(50vw,160px)] object-contain object-center"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {step === "paying" ? (
        <Card className="border border-transparent shadow-sm ring-1 ring-foreground/10">
          <CardContent className="flex flex-col items-center justify-center gap-5 py-16 text-center">
            <div className="relative size-14">
              <span className="absolute inset-0 rounded-full border-2 border-[color-mix(in_oklab,var(--accent)_28%,transparent)]" />
              <span className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-[color-mix(in_oklab,var(--accent)_90%,var(--foreground))]" />
              <Loader2
                className="absolute inset-0 m-auto size-6 text-[color-mix(in_oklab,var(--accent)_85%,var(--foreground))] opacity-90"
                aria-hidden
              />
            </div>
            <div className="space-y-2">
              <p className="text-base font-medium text-foreground">
                Za moment nastąpi przekierowanie…
              </p>
              <p className="max-w-md text-sm text-muted-foreground">
                Już za chwilę przekierujemy Cię do bezpiecznej i szybkiej płatności.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
