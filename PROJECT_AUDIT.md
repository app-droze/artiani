# Project Audit

## Scope

This audit is based on a read-first inspection of the repository on 2026-03-16, followed by local verification of `npm run lint` and `npm run build` inside `web/`.

Confirmed inputs inspected:

- `README.md`
- `NOTES.md`
- `web/package.json`
- `web/package-lock.json`
- `web/.env.local` keys only
- `web/next.config.ts`
- `web/middleware.ts`
- `web/tsconfig.json`
- `web/eslint.config.mjs`
- `web/postcss.config.mjs`
- `web/app/**`
- `web/src/**`
- `web/public/**`

Not found during inspection:

- Root `package.json`
- `.env.example`
- Dockerfile / `docker-compose.yml`
- CI workflows
- database schema files
- migrations
- ORM config
- test files

## High-Level Summary

### What this project is

Artiani is a museum-minimal bilingual storefront for Levan Margiani artworks. The live application is a single Next.js app stored in `web/`, while the repository root mainly contains meta-docs and workflow notes.

### What problem it solves

The app presents a curated product catalogue and supports two transaction patterns:

- direct purchase flow for cards, bookmarks, calendars, and prints
- auction bid flow for paintings

It also provides post-submission tracking by code + email and sends transactional emails when mail credentials are configured.

### Current maturity level

This is a functional early-production or strong prototype codebase, not a fully operationalized product platform.

Evidence:

- the main storefront, cart, checkout, bid, and tracking flows are implemented
- build and lint pass locally
- server-side repricing exists for orders
- data and pricing rules are still hardcoded in source
- there are no tests, migrations, CI files, admin tools, or deployment manifests

### Main visible product areas

- Homepage / editorial landing page: `web/src/components/HomePage.tsx`
- Product catalogue with filters: `web/src/components/ShopCatalog.tsx`
- Product detail pages with gallery and purchase/bid panels: `web/src/components/ProductDetails.tsx`
- Cart and checkout: `web/src/components/CartView.tsx`, `web/src/components/CheckoutForm.tsx`
- Bid result and order tracking: `web/src/components/BidResultView.tsx`, `web/src/components/TrackOrderView.tsx`
- About page: `web/app/[lang]/about/page.tsx`

## Technology Inventory

### Confirmed stack

- Frontend framework: Next.js 16.1.6 App Router
- Backend framework: Next.js Route Handlers running with `runtime = "nodejs"`
- Languages: TypeScript, JSON, CSS
- UI library: React 19.2.3
- Styling: Tailwind CSS v4 via `@import "tailwindcss"` plus custom CSS in `web/app/globals.css`
- Fonts: local `FiraGO` via `@font-face`
- State management: React Context + component state + `localStorage`
- Routing: Next.js App Router with locale segment `app/[lang]/...`
- i18n: custom JSON dictionaries in `web/src/i18n/en.json` and `web/src/i18n/ka.json`
- Data fetching: server imports for product/i18n data; client `fetch()` to internal API routes
- Database client: `@supabase/supabase-js`
- ORM: none
- Auth: no end-user auth flow found
- Email: Nodemailer over Gmail SMTP
- Payments: manual bank transfer instructions, no payment gateway SDK
- Image hosting: Supabase Storage remote URLs
- Testing: none found
- Linting: ESLint 9 with `eslint-config-next`
- Type checking: Next build + TypeScript compiler settings
- Bundler/build tool: Next.js / Turbopack build output confirmed locally
- Package manager: npm (confirmed by `package-lock.json`)

### Infra and deployment related

Confirmed:

- Next image remote pattern for Supabase Storage in `web/next.config.ts`
- locale redirect middleware in `web/middleware.ts`
- environment-based Supabase + mail config in `web/src/lib/env.server.ts`

Not found:

- Docker
- Vercel config
- Netlify config
- CI/CD workflows
- infrastructure as code
- monitoring / analytics integrations

### Third-party integrations

- Supabase database access via service-role client: `web/src/lib/supabaseAdmin.ts`
- Supabase Storage for product images: `web/next.config.ts`, `web/src/data/products.ts`
- Gmail SMTP via Nodemailer: `web/src/lib/emailOrders.ts`, `web/src/lib/emailBids.ts`
- Bank transfer copy referencing TBC and Bank of Georgia: `web/src/lib/paymentInstructions.ts`

## Repository Structure

## Top-level layout

- `AGENTS.md`: repo-specific workflow and constraints
- `NOTES.md`: historical change log and implementation notes
- `README.md`: short root overview
- `.agents/`: local Codex skills; not application runtime code
- `web/`: the actual Next.js application

### `web/`

Purpose:

- Contains the full web application, including UI, route handlers, runtime config, and assets.

Important files:

- `web/package.json`: scripts and dependencies
- `web/next.config.ts`: Next image remote patterns
- `web/middleware.ts`: locale redirect logic
- `web/app/`: App Router routes and layouts
- `web/src/components/`: UI and flow components
- `web/src/data/products.ts`: product catalogue, prices, auction metadata
- `web/src/lib/`: cart, pricing, env, email, and Supabase helpers
- `web/src/i18n/`: dictionaries and locale helpers

How it fits:

- This is the only runnable app in the repository.

### `.agents/`

Purpose:

- Local workflow skills and instructions for repository maintenance.

How it fits:

- Useful for contributors using Codex tooling, but not part of the deployed application.

### `NOTES.md`

Purpose:

- Operational memory of previous work, product decisions, and implementation steps.

How it fits:

- Valuable for engineering context, but not authoritative runtime documentation.

## Clean Tree

Excluded: `node_modules`, `.git`, `.next`, `dist`, `build`, `coverage`, `out`, `target`, `vendor`, `tmp`, `.cache`

```text
.
├── .agents/
│   └── skills/
│       ├── codex-workloop/
│       ├── i18n-sweep/
│       ├── nextjs-sanity/
│       ├── route-hygiene/
│       └── ui-components/
├── AGENTS.md
├── NOTES.md
├── README.md
└── web/
    ├── .env.local
    ├── .env.local.rtf
    ├── README.md
    ├── app/
    │   ├── [lang]/
    │   │   ├── about/page.tsx
    │   │   ├── bid/page.tsx
    │   │   ├── cart/page.tsx
    │   │   ├── catalogue/page.tsx
    │   │   ├── checkout/page.tsx
    │   │   ├── layout.tsx
    │   │   ├── page.tsx
    │   │   ├── product/[slug]/page.tsx
    │   │   └── track/page.tsx
    │   ├── api/
    │   │   ├── bids/create/route.ts
    │   │   └── orders/
    │   │       ├── create/route.ts
    │   │       └── lookup/route.ts
    │   ├── apple-icon.png
    │   ├── favicon.ico
    │   ├── globals.css
    │   ├── icon.png
    │   └── layout.tsx
    ├── eslint.config.mjs
    ├── fonts/
    ├── middleware.ts
    ├── next.config.ts
    ├── package-lock.json
    ├── package.json
    ├── postcss.config.mjs
    ├── public/
    │   ├── brand/sheep-seal.png
    │   ├── file.svg
    │   ├── fonts/firago_5.2.5/...
    │   ├── globe.svg
    │   ├── next.svg
    │   ├── vercel.svg
    │   └── window.svg
    ├── src/
    │   ├── components/
    │   │   ├── product/
    │   │   └── ui/
    │   ├── data/
    │   │   └── products.ts
    │   ├── i18n/
    │   │   ├── en.json
    │   │   ├── getDictionary.ts
    │   │   ├── ka.json
    │   │   └── locales.ts
    │   └── lib/
    │       ├── cart.ts
    │       ├── emailBids.ts
    │       ├── emailOrders.ts
    │       ├── env.server.ts
    │       ├── money.ts
    │       ├── orderCode.ts
    │       ├── orderPricing.ts
    │       ├── paymentInstructions.ts
    │       └── supabaseAdmin.ts
    └── tsconfig.json
```

## Runtime Behavior

### Entry points

- Root layout: `web/app/layout.tsx`
- Locale layout with cart provider and nav: `web/app/[lang]/layout.tsx`
- Locale redirect middleware: `web/middleware.ts`

### Page routes

- `/{lang}`: homepage
- `/{lang}/about`
- `/{lang}/catalogue`
- `/{lang}/product/{slug}`
- `/{lang}/cart`
- `/{lang}/checkout`
- `/{lang}/track`
- `/{lang}/bid`

### API routes

- `POST /api/orders/create`: validates order payload, reprices server-side, inserts into Supabase, inserts order items, optionally sends emails
- `POST /api/orders/lookup`: validates `code + email`, then returns all orders and bids for that email if one matching code is valid
- `POST /api/bids/create`: validates bid payload, validates minimum bid, inserts bid, optionally sends emails

### Authentication and authorization

Confirmed:

- no user login flow
- no session handling
- no role system
- no route protection for end users

Inferred:

- order and bid administration likely happens directly in Supabase or out of band, because no admin interface is present in this repo

### Form handling

- Checkout uses `useState` and `fetch("/api/orders/create")`
- Bid submission uses `useState` and `fetch("/api/bids/create")`
- Tracking uses `useState` and `fetch("/api/orders/lookup")`
- All three forms disable inputs during submission

### State flow

- Cart state is stored in React context and persisted to `localStorage` under `artiani_cart_v1`
- Product options are selected client-side, then sent to APIs
- Order price is recomputed on the server to avoid trusting client totals

### Database flow

No schema files are present, so this section is partially inferred from query code.

Confirmed table names used:

- `orders`
- `order_items`
- `bids`

Confirmed flow:

1. Client submits a payload to an internal API route.
2. Route validates request shape.
3. Route reprices or validates against `products.ts`.
4. Route uses a Supabase service-role client to write/read rows.
5. Route returns a short JSON response to the UI.

### Background jobs, webhooks, uploads

- Background jobs: none found
- Webhooks: none found
- File uploads: none found
- Storage writes: none found in app code
- Remote image reads only: yes, from Supabase Storage

### Environment and config usage

Confirmed env vars referenced in code:

- Required for server APIs: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_SECRET_KEY`
- Optional for mail: `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `ORDERS_FROM_EMAIL`, `ORDERS_ADMIN_EMAIL`
- Optional base URL: `PUBLIC_BASE_URL`

Notes:

- `web/.env.local` exists locally, but there is no `.env.example`
- `PUBLIC_BASE_URL` is supported in code but was not present in the inspected `.env.local` keys
- mail is intentionally optional; order/bid creation still succeeds without it

### Error handling and logging

- APIs return generic user-facing error messages
- UI surfaces generic localized error text
- server logs use `console.error`
- no structured logging
- no monitoring / alerting integration found

## Product and Code Audit

### Implemented features

- bilingual locale-aware routing (`ka`, `en`)
- homepage with featured paintings and quick-shop tiles
- multi-category product catalogue
- product detail pages with gallery, lightbox, related products, and option selection
- client-side cart with persistence
- checkout submission flow
- server-side order repricing and order code generation
- order item persistence
- auction bid submission flow for paintings
- bid code generation
- code+email tracking screen
- transactional emails for orders and bids when SMTP config is present

### Incomplete features / placeholders / inferred gaps

- Bank account details are placeholders in `web/src/lib/paymentInstructions.ts`
- No database schema or migration files are present, so table definitions are undocumented
- No admin UI exists for changing order or bid status
- Auction `bidCount` is static product metadata, not live data
- `depositGEL` exists in the type but is not populated in the current painting entries
- `web/README.md` is still generic create-next-app boilerplate and is no longer accurate

### Dead code / suspicious files

- `web/fonts/` exists but appears empty
- stray macOS files: `web/.DS_Store`, `web/app/.DS_Store`, `web/public/.DS_Store`
- stray rich text env file: `web/.env.local.rtf`
- default template assets appear unused: `web/public/file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, `window.svg`

### Obvious bugs or fragile areas

- `web/middleware.ts` uses the deprecated `middleware` convention; local build warns it should move to `proxy`
- Product catalogue, pricing rules, auction metadata, and much of business logic are centralized in `web/src/data/products.ts`; every catalogue/content change is a code deploy
- Tracking returns all orders and all bids for an email after validating just one `code + email` pair. That may be intentional, but it broadens exposure if any valid code leaks
- Checkout success and bid success depend on UI query state and generic API responses; there is no stronger reconciliation or server-rendered confirmation route

### Security concerns

- No authentication or authorization model
- No rate limiting or anti-automation protections on public order/bid endpoints
- No CAPTCHA or abuse controls on forms
- Supabase service-role access is embedded in the app server boundary; operational security depends entirely on environment handling
- Tracking endpoint exposes account history for a matching email after one valid code match

### Performance concerns

- `products.ts` is imported into multiple client components, so the static catalogue data ships into client bundles more than necessary
- No pagination, search indexing, or incremental data loading
- Remote images are numerous and all product metadata is code-level static data

### Maintainability concerns

- No tests
- No schema definitions
- No typed API contract layer beyond local TypeScript types
- Manual payload validation instead of reusable schema validation
- Similar item-summary rendering logic is duplicated across cart, checkout, tracking, and emails
- Documentation is fragmented between `README.md`, `web/README.md`, and `NOTES.md`

### Documentation gaps

- no accurate setup guide in the app folder
- no env template
- no DB bootstrap documentation
- no deployment guide
- no explanation of expected Supabase tables
- no explicit production operations guide for status updates or mail setup

## Verified Commands

Executed successfully in `web/` during this audit:

```bash
npm run lint
npm run build
```

Build note:

- build succeeds locally
- Next.js emits a deprecation warning for `middleware.ts`

## Recommended Next Steps

1. Add a documented database contract: Supabase SQL schema, indexes, constraints, and status enums for `orders`, `order_items`, and `bids`.
2. Replace placeholder banking data and document the real payment / deposit operations flow end to end.
3. Add automated tests for pricing, order creation, bid validation, and tracking behavior.
4. Introduce abuse protections for public APIs: rate limiting, bot protection, and logging around failed attempts.
5. Move catalogue and auction data out of source code into a managed CMS or database-backed admin flow.
6. Replace deprecated `middleware.ts` with the current Next.js `proxy` convention.
7. Create a real `.env.example` and simplify the contributor docs so `README.md` and `web/README.md` stop conflicting.

