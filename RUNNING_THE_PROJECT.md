# Running The Project

## Important Context

The runnable app is inside `web/`. There is no root `package.json`, so all npm commands must be executed from that folder.

Verified during this audit on 2026-03-16:

```bash
cd web
npm run lint
npm run build
```

Both commands succeeded locally. `npm run build` emitted a Next.js deprecation warning for `web/middleware.ts`.

## Prerequisites

- Node.js compatible with Next.js 16 and React 19
- npm
- access to the required environment variables
- a Supabase project containing the expected tables

## Install Dependencies

```bash
cd web
npm install
```

Notes:

- `package-lock.json` is present, so npm is the intended package manager.
- No additional workspace bootstrap step is required.

## Environment Variables

There is no `.env.example`, so the current expected variables must be inferred from `web/src/lib/env.server.ts`.

### Required for server APIs

```bash
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

Accepted alias:

```bash
SUPABASE_SECRET_KEY=
```

### Optional for email sending

If these are missing, order and bid creation still work, but email delivery is skipped and the UI/API report `emailSent: false`.

```bash
GMAIL_USER=
GMAIL_APP_PASSWORD=
ORDERS_FROM_EMAIL=
ORDERS_ADMIN_EMAIL=
```

### Optional but recommended for production

```bash
PUBLIC_BASE_URL=
```

If omitted, the app falls back to:

```text
http://localhost:3000
```

### Local setup

Create `web/.env.local` with the values above.

Uncertainty:

- The repo already contains a local `web/.env.local`, but this audit did not copy or expose values.
- `web/.env.local.rtf` also exists and looks like an accidental rich-text duplicate, not a supported config file.

## Run Locally

```bash
cd web
npm run dev
```

Open:

```text
http://localhost:3000
```

Locale behavior:

- `/` redirects to `/ka`
- supported locale prefixes are `ka` and `en`

## Lint

```bash
cd web
npm run lint
```

What it runs:

- `eslint`

Formatting:

- No Prettier config or `format` script was found.

## Build Production

```bash
cd web
npm run build
```

Confirmed output characteristics:

- Next.js 16.1.6 build succeeds
- route handlers are included for order and bid APIs
- build warns that `middleware.ts` is deprecated in favor of `proxy`

## Start Production Server

```bash
cd web
npm run start
```

This assumes a successful prior build and a production-appropriate `.env.local` or environment injection strategy.

## Tests

No test framework or test files were found.

Current state:

```text
There is no `test` script and no automated tests in the repository.
```

Recommended stopgap validation after changes:

```bash
cd web
npm run lint
npm run build
```

Then manually verify:

- `/ka` and `/en`
- `/ka/catalogue`
- a print product page
- a painting page with bid form
- `/ka/cart`
- `/ka/checkout`
- `/ka/track`

## Database Requirements

No schema or migration files are present, so the following is inferred from code, not confirmed by SQL files.

Expected tables referenced by the app:

- `orders`
- `order_items`
- `bids`

Expected behaviors inferred from inserts/selects:

- `orders` stores order code, customer data, totals, status, language, currency, timestamps
- `order_items` stores product slug/kind, localized titles, qty, prices, and selected options
- `bids` stores bid code, product slug, bidder details, amount, note, status, timestamps

Important operational note:

- The app can create and read these records, but this repo does not include migrations, seeds, or admin tools to manage them.

## Seeding / Migrations

Not available in this repository.

Current status:

- no Prisma
- no Drizzle
- no SQL migrations
- no seed scripts

If a new engineer needs a fresh environment, the missing database bootstrap is the first major blocker.

## Frontend / Backend Separation

There is no separate frontend and backend service.

Instead:

- frontend pages and components live in the same Next.js app
- backend APIs are Next.js route handlers under `web/app/api`

So the correct local startup model is one process:

```bash
cd web
npm run dev
```

## Deployment Notes

No deployment manifests were found.

Confirmed deployment characteristics:

- this is a standard Next.js application
- it depends on server-side environment variables for Supabase and optional SMTP
- product images are loaded from Supabase Storage

Reasonable deployment inference:

- Vercel or any Node-compatible host that supports Next.js server routes should work

Missing deployment documentation:

- env injection strategy
- build/start commands for hosting
- domain / `PUBLIC_BASE_URL` guidance
- Supabase project bootstrap
- SMTP setup steps

## Known Issues and Caveats

- `web/middleware.ts` is deprecated by current Next.js warnings; it should move to `proxy`
- `web/README.md` is outdated starter text and should not be treated as authoritative
- payment instructions include placeholder IBAN values in code
- no automated tests exist
- no anti-abuse protections were found on public write endpoints

## Recommended Next Steps

1. Add `.env.example` with comments for required and optional variables.
2. Document or commit the Supabase schema and any required indexes / constraints.
3. Add a deployment guide for the chosen hosting platform.
4. Add at least smoke tests for pricing, order creation, bid validation, and tracking.
5. Replace deprecated `middleware.ts` with the current Next.js approach.

