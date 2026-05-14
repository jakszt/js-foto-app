"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Camera, CalendarDays, Loader2, Minus, Plus } from "lucide-react";
import { Controller, useForm, useWatch } from "react-hook-form";
import posthog from "posthog-js";

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
  formatPln,
  PHOTO_COUNT_MAX,
  PHOTO_COUNT_MIN,
  PHOTO_GROSS_PLN,
  totalGrossPln,
} from "@/lib/photo-checkout-pricing";
import { cn } from "@/lib/utils";

type Step = "tiles" | "billing" | "paying";

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
  const [step, setStep] = useState<Step>("tiles");
  const [apiError, setApiError] = useState<string | null>(null);
  const billingOpenedAtRef = useRef<number | null>(null);
  const honeypotRef = useRef<HTMLInputElement>(null);

  const form = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutFormSchema),
    defaultValues,
    mode: "onChange",
  });

  const watched = useWatch({ control: form.control });
  const photoCount =
    typeof watched?.photoCount === "number"
      ? watched.photoCount
      : defaultValues.photoCount;
  const totalBrutto = totalGrossPln(photoCount);
  const complete = useMemo(() => {
    const merged = { ...defaultValues, ...watched } as CheckoutFormValues;
    return isFormComplete(merged);
  }, [watched]);

  useEffect(() => {
    if (step !== "billing") return;
    if (billingOpenedAtRef.current == null) {
      billingOpenedAtRef.current = Date.now();
    }
  }, [step]);

  async function onPay(values: CheckoutFormValues) {
    setApiError(null);
    setStep("paying");

    posthog.identify(values.email);
    posthog.capture("checkout_payment_submitted", {
      is_company: values.isCompany,
      photo_count: values.photoCount,
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
      const data = (await res.json()) as { paymentUrl?: string; error?: string };
      if (!res.ok || !data.paymentUrl) {
        throw new Error(data.error ?? "Nie udało się przygotować płatności");
      }
      window.location.assign(data.paymentUrl);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Wystąpił błąd";
      posthog.capture("checkout_payment_error", { error: message });
      posthog.captureException(e);
      setApiError(message);
      setStep("billing");
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
          Wybierz, co Cię dotyczy — po sesji rozliczymy zdjęcia przez bezpieczną płatność online
          (inFakt).
        </p>
      </header>

      {step === "tiles" ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => {
              billingOpenedAtRef.current = Date.now();
              setStep("billing");
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
                  Dane do faktury i przejście do szybkiej płatności online.
                </CardDescription>
              </CardHeader>
              <CardFooter className="text-sm font-medium text-[color-mix(in_oklab,var(--accent)_78%,var(--foreground))]">
                Rozpocznij →
              </CardFooter>
            </Card>
          </button>

          <div className="flex flex-col gap-4">
            <Card className="h-full border border-transparent bg-card/90 shadow-sm ring-1 ring-foreground/10">
              <CardHeader>
                <div className="mb-1 flex size-11 items-center justify-center rounded-lg bg-[color-mix(in_oklab,var(--accent)_14%,transparent)] text-[color-mix(in_oklab,var(--accent)_88%,var(--foreground))]">
                  <CalendarDays className="size-5" aria-hidden />
                </div>
                <CardTitle className="text-lg">Chcę umówić sesję</CardTitle>
                <CardDescription>
                  Wybierz dogodny termin w kalendarzu poniżej — potwierdzenie dostaniesz mailem od
                  Google Calendar.
                </CardDescription>
              </CardHeader>
            </Card>
            <div className="overflow-hidden rounded-xl bg-card shadow-sm ring-1 ring-foreground/10">
              <iframe
                title="Umów sesję — Google Calendar"
                src="https://calendar.google.com/calendar/appointments/schedules/AcZssZ2xWPDJbzLQyJba_ZPPei1f80ldgfA3svVG_qweYkROYefo6aPkAUDnhWZxPAuXSQNNWI67WayH?gv=true"
                className="block min-h-[600px] w-full border-0"
                width="100%"
                height={600}
                loading="lazy"
              />
            </div>
          </div>
        </div>
      ) : null}

      {step === "billing" ? (
        <Card className="border border-transparent shadow-md ring-1 ring-foreground/10">
          <CardHeader>
            <CardTitle className="text-xl">Dane do faktury</CardTitle>
            <CardDescription>
              Uzupełnij pola — etykiety uniosą się przy focusie, tak jak w nowoczesnych
              formularzach.
            </CardDescription>
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
                        {PHOTO_GROSS_PLN} zł brutto / szt. (VAT 23%)
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
                      Liczba zdjęć od {PHOTO_COUNT_MIN} do {PHOTO_COUNT_MAX}
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
                className="flex flex-col gap-1 rounded-lg border border-[color-mix(in_oklab,var(--accent)_25%,var(--border))] bg-[color-mix(in_oklab,var(--accent)_8%,var(--card))] px-4 py-3 sm:flex-row sm:items-baseline sm:justify-between"
                aria-live="polite"
              >
                <span className="text-sm text-muted-foreground">
                  {photoCount} × {PHOTO_GROSS_PLN} zł brutto
                </span>
                <span className="text-lg font-bold tabular-nums text-foreground">
                  Razem {formatPln(totalBrutto)}
                </span>
              </div>

              {apiError ? (
                <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                  {apiError}
                </p>
              ) : null}

              <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
                <Button
                  type="button"
                  variant="ghost"
                  className="text-muted-foreground"
                  onClick={() => {
                    setStep("tiles");
                    setApiError(null);
                    posthog.capture("checkout_back_clicked");
                  }}
                >
                  ← Wróć
                </Button>
                <Button
                  type="submit"
                  size="lg"
                  disabled={!complete || form.formState.isSubmitting}
                  className={cn(
                    "min-w-[220px] font-semibold tracking-wide transition-[transform,box-shadow,opacity,filter] duration-300",
                    complete
                      ? "bg-[color-mix(in_oklab,var(--accent)_92%,white)] text-[#2a241c] shadow-[0_10px_40px_-18px_color-mix(in_oklab,var(--accent)_55%,transparent)] hover:bg-[color-mix(in_oklab,var(--accent)_82%,white)]"
                      : "opacity-40 grayscale-[0.35] shadow-none"
                  )}
                >
                  OPŁAĆ ZDJĘCIA
                </Button>
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
                Za moment przekierujemy Cię do płatności…
              </p>
              <p className="max-w-md text-sm text-muted-foreground">
                Tworzymy fakturę w inFakcie i otwieramy bezpieczny link Autopay / szybkiej płatności
                zgodnie z{" "}
                <a
                  className="underline underline-offset-4 hover:text-foreground"
                  href="https://docs.infakt.pl/#6e227498-f889-48cd-b344-c2ed3a748463"
                  target="_blank"
                  rel="noreferrer"
                >
                  dokumentacją inFakt
                </a>
                .
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
