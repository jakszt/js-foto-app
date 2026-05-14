<wizard-report>
# PostHog post-wizard report

The wizard has completed a deep integration of PostHog analytics into js-foto (Next.js 16 App Router).

## Summary of changes

- **`instrumentation-client.ts`** (new) — initializes `posthog-js` client-side via Next.js 15.3+ instrumentation hook, with EU host, exception capture enabled, and reverse proxy routing through `/ingest`.
- **`next.config.ts`** — added reverse proxy rewrites so PostHog requests route through `/ingest/*` (less likely to be blocked by ad blockers). Both `/ingest/static/*` and `/ingest/array/*` point to the EU assets origin.
- **`src/lib/posthog-server.ts`** (new) — lightweight server-side PostHog client (`posthog-node`) for API routes; `flushAt: 1 / flushInterval: 0` ensures events fire immediately in Next.js serverless functions.
- **`src/components/contact-nav.tsx`** (new) — client component wrapping the homepage contact links, enabling click tracking without converting the server component page.
- **`src/app/page.tsx`** — replaced inline nav markup with `<ContactNav />` to enable event tracking.
- **`src/components/photographer-checkout.tsx`** — added `posthog.capture()` calls for the full checkout flow, `posthog.identify()` on form submit (email as distinct ID, no PII in properties), and `posthog.captureException()` on errors. Client distinct ID and session ID are forwarded to the server via request headers for cross-domain correlation.
- **`src/app/api/checkout/route.ts`** — added server-side `posthog-node` capture for invoice creation success/failure, correlated to the same distinct ID passed from the client via `X-POSTHOG-DISTINCT-ID` header.
- **`.env.local`** — `NEXT_PUBLIC_POSTHOG_TOKEN` and `NEXT_PUBLIC_POSTHOG_HOST` set (EU region).

## Events

| Event | Description | File |
|---|---|---|
| `checkout_session_started` | User clicks the "Jestem po sesji" tile and opens the billing form | `src/components/photographer-checkout.tsx` |
| `checkout_back_clicked` | User clicks the back button on the billing form | `src/components/photographer-checkout.tsx` |
| `checkout_payment_submitted` | User submits the billing form (payment initiated) | `src/components/photographer-checkout.tsx` |
| `checkout_payment_error` | Client-side error during checkout (API call failed) | `src/components/photographer-checkout.tsx` |
| `checkout_invoice_created` | Server: invoice created successfully in inFakt | `src/app/api/checkout/route.ts` |
| `checkout_invoice_failed` | Server: invoice creation or payment URL generation failed | `src/app/api/checkout/route.ts` |
| `contact_email_clicked` | User clicks the email contact link on the homepage | `src/components/contact-nav.tsx` |
| `contact_linkedin_clicked` | User clicks the LinkedIn contact link on the homepage | `src/components/contact-nav.tsx` |

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

- [Analytics basics dashboard](/dashboard/682216)
- [Checkout conversion funnel](/insights/qZzbfMT0) — steps from session start → payment submitted → invoice created
- [Checkout session starts](/insights/IkjphxS3) — daily trend of users entering the checkout flow
- [Invoice success vs failure](/insights/nrgbce8t) — server-side invoice creation outcomes over time
- [Contact link clicks](/insights/gBfwhL6l) — email and LinkedIn engagement from the homepage
- [Checkout errors](/insights/zlAxLiQW) — client payment errors and server invoice failures side by side

### Agent skill

We've left an agent skill folder in your project. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

</wizard-report>
