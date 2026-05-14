<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Cursor Cloud specific instructions

### Project overview
js-foto is a Next.js 16 (App Router) portfolio + photography checkout site. See `README.md` for standard commands (`npm run dev`, `npm run build`, `npm run lint`).

### Running the dev server
- `npm run dev` starts Next.js on port 3000 (Turbopack).
- The homepage (`/`) and photo checkout page (`/foto`) render without any env vars.
- The checkout POST (`/api/checkout`) requires `INFAKT_API_KEY` to succeed; without it, the API returns 500. All other external services (Supabase, Mailjet, PostHog) degrade gracefully when their env vars are absent.
- Copy `.env.example` to `.env.local` and fill in any needed keys.

### Lint & build
- `npm run lint` runs ESLint (flat config). Expect 1 non-blocking warning about `form.watch` from React Compiler.
- `npm run build` runs a full production build with TypeScript checking. No test suite is configured.

### External services (all SaaS, no local infra)
- **inFakt** — invoice creation + payment links. Sandbox available at `https://api.sandbox-infakt.pl/v3`.
- **Supabase** — hosted Postgres for checkout records. Skipped if keys are missing.
- **Mailjet** — transactional emails. Skipped if keys are missing.
- **PostHog** — analytics. Skipped if token is missing.
