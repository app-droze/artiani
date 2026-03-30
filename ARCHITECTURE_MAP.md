# Architecture Map

## System Shape

This repository is not a true monorepo. It is a single Next.js application nested under `web/`, plus root-level process documentation.

Architecture style:

- hybrid feature-based + layered
- server-rendered pages for composition and i18n
- client components for interactivity
- thin internal API layer for writes and protected reads
- static in-repo product catalog as the source of truth for product metadata and pricing rules

## Main Layers

### 1. Routing and composition

Files:

- `web/app/layout.tsx`
- `web/app/[lang]/layout.tsx`
- `web/app/[lang]/**/page.tsx`

Role:

- defines entry points
- loads dictionaries
- wraps pages with `CartProvider`
- renders top navigation

Key boundary:

- route files are mostly server components that assemble data and pass it into client components

## 2. Presentation layer

Files:

- `web/src/components/*.tsx`
- `web/src/components/product/*.tsx`
- `web/src/components/ui/*.tsx`

Role:

- renders all user-facing screens
- owns local interactive state
- performs internal API calls from the browser

Examples:

- `HomePage.tsx`: editorial landing composition
- `ShopCatalog.tsx`: filterable catalogue grid
- `ProductDetails.tsx`: option selection + bid/cart orchestration
- `CheckoutForm.tsx`: checkout POST flow
- `TrackOrderView.tsx`: tracking POST flow

## 3. Content and domain data

Files:

- `web/src/data/products.ts`
- `web/src/i18n/en.json`
- `web/src/i18n/ka.json`
- `web/src/i18n/getDictionary.ts`
- `web/src/i18n/locales.ts`

Role:

- `products.ts` acts as both content store and partial domain model
- i18n JSON files hold almost all user-facing copy

Important implication:

- catalogue content, pricing, option availability, image URLs, and auction metadata are code-managed, not CMS-managed

## 4. Client-side domain helpers

Files:

- `web/src/lib/cart.ts`
- `web/src/components/CartProvider.tsx`
- `web/src/lib/money.ts`

Role:

- cart item shape
- local persistence
- display formatting

## 5. Server-side business logic

Files:

- `web/src/lib/orderPricing.ts`
- `web/src/lib/orderCode.ts`
- `web/src/lib/env.server.ts`
- `web/src/lib/supabaseAdmin.ts`
- `web/src/lib/emailOrders.ts`
- `web/src/lib/emailBids.ts`
- `web/src/lib/paymentInstructions.ts`

Role:

- input normalization
- repricing and validation
- code generation
- environment loading
- DB access
- email delivery

This is the closest thing to a service layer in the repo.

## 6. API layer

Files:

- `web/app/api/orders/create/route.ts`
- `web/app/api/orders/lookup/route.ts`
- `web/app/api/bids/create/route.ts`

Role:

- accepts browser requests
- validates JSON payloads
- calls server-side lib helpers
- reads/writes Supabase tables
- returns JSON

## Route Map

### Locale-aware pages

- `/{lang}`: home
- `/{lang}/about`: artist info
- `/{lang}/catalogue`: category browsing
- `/{lang}/product/{slug}`: product / painting detail
- `/{lang}/cart`: cart review
- `/{lang}/checkout`: redirects to `/{lang}/cart`
- `/{lang}/track`: order/bid tracking
- `/{lang}/bid`: bid success state

### Internal API routes

- `POST /api/orders/create`
- `POST /api/orders/lookup`
- `POST /api/bids/create`

### Redirect behavior

`web/middleware.ts` redirects paths without a locale prefix to `/ka/...`. API paths and static assets are excluded.

## Server / Client Boundary

### Server-only responsibilities

- locale metadata generation: `web/app/[lang]/layout.tsx`
- API handlers under `web/app/api/**`
- Supabase admin client: `web/src/lib/supabaseAdmin.ts`
- env loading: `web/src/lib/env.server.ts`
- order repricing: `web/src/lib/orderPricing.ts`
- email sending: `web/src/lib/emailOrders.ts`, `web/src/lib/emailBids.ts`

### Client-only responsibilities

- cart persistence and UI state: `CartProvider.tsx`, `cart.ts`
- catalogue filter state: `ShopCatalog.tsx`
- product option selection and bid form state: `ProductDetails.tsx`, `ProductPurchasePanel.tsx`
- checkout submission and success UI: `CheckoutForm.tsx`
- tracking form and results: `TrackOrderView.tsx`
- nav state and mobile drawer: `SiteNav.tsx`

### Mixed rendering pattern

The route component is usually server-rendered, but the important screen body is a client component. This gives SSR for page assembly and i18n, while keeping interaction logic in the browser.

## Main Data Flows

## 1. Locale and copy flow

1. Request enters `web/middleware.ts`.
2. Missing locale prefixes redirect to `/ka/...`.
3. `web/app/[lang]/layout.tsx` validates the locale and loads the dictionary.
4. Pages pass the dictionary into components.
5. Components read strings through `t(dict, key)`.

Notes:

- i18n is dictionary-key driven, not namespace-based.
- Missing keys fall back to the raw key string.

## 2. Catalogue and product flow

1. `products.ts` exports the full catalogue.
2. Catalogue page imports the array directly.
3. `ShopCatalog.tsx` filters via URL query params and client state.
4. Product route finds a product by slug from the same array.
5. Product detail components derive images, options, and related items from the same source.

Implication:

- There is no read API for products; product reads are compile/runtime imports.

## 3. Cart flow

1. `CartProvider` initializes from `localStorage`.
2. Product detail page calculates the chosen price client-side.
3. `addItem()` stores a derived line item containing product ID, slug, price, qty, and options.
4. Cart and checkout read the same shared context.
5. Local persistence uses the fixed key `artiani_cart_v1`.

Important constraint:

- cart persistence is intentionally browser-only and not synced to the server

## 4. Checkout flow

1. User fills checkout form in `CheckoutForm.tsx`.
2. Browser POSTs to `/api/orders/create`.
3. Route validates payload.
4. Route calls `priceCart()` to recompute prices from canonical product data.
5. Route inserts into `orders`.
6. Route inserts line rows into `order_items`.
7. Route optionally sends emails.
8. Browser shows a success state with order code and bank transfer instructions.

Strong point:

- pricing is recomputed server-side, so the server does not trust browser totals

Weak point:

- order status management is outside this repo

## 5. Bid flow

1. On painting pages, `ProductPurchasePanel.tsx` shows auction UI.
2. Browser POSTs bid data to `/api/bids/create`.
3. Route validates locale, product slug, bidder fields, and minimum bid.
4. Route inserts a row into `bids`.
5. Route optionally sends emails.
6. Browser redirects to `/{lang}/bid` with query params showing the code and amount.

Strong point:

- minimum bid is validated on the server against `products.ts`

Weak points:

- auction counts shown in UI are static metadata
- success page is query-param driven rather than server-fetched

## 6. Tracking flow

1. User submits code + email in `TrackOrderView.tsx`.
2. Browser POSTs to `/api/orders/lookup`.
3. API confirms at least one matching order or bid for that code/email pair.
4. API then fetches all orders and all bids for the email.
5. UI renders both lists.

This behavior is confirmed in `web/app/api/orders/lookup/route.ts`. It is convenient, but broader than single-order lookup.

## Models and Schemas

## Confirmed TypeScript models

- `Product`, `ProductKind`, `PrintVariant`: `web/src/data/products.ts`
- `CartItem`, `CartItemOptions`, `CartState`: `web/src/lib/cart.ts`
- `OrderItemInput`, `PricedLineItem`, `PriceCartResult`: `web/src/lib/orderPricing.ts`

## Missing schema layer

Not found:

- Zod / Valibot / Yup
- Prisma schema
- Drizzle schema
- SQL migrations

Validation is implemented manually inside route handlers and server libs.

## Separation of Concerns: What Works Well

- UI composition is separate from route files
- cart persistence is isolated in `CartProvider` and `cart.ts`
- server repricing lives outside route handlers
- email generation is extracted into dedicated modules
- i18n is centralized in JSON dictionaries

## Separation of Concerns: Where It Blurs

- `products.ts` combines content, presentation assets, pricing, option metadata, and auction configuration
- client components often import the entire product catalogue for name or option lookups
- API validation is hand-written inside each route instead of shared schemas
- rendering of order line item details is duplicated across several components and emails

## Architecture Inconsistencies / Code Smells

1. Static catalogue as domain source of truth.
   This is simple, but it couples merchandising updates to code deploys.

2. Missing operational boundary for order lifecycle.
   Creation and lookup exist, but no in-repo admin workflow exists for fulfillment, payment confirmation, or bid status changes.

3. Thin API, thick components.
   Many user flows are orchestrated in large client components rather than smaller feature modules.

4. Documentation drift.
   `web/README.md` still describes a create-next-app starter, while actual behavior is much richer.

5. Deprecated Next.js convention.
   The locale redirect still uses `middleware.ts`; current Next.js warns to use `proxy`.

## Recommended Next Steps

1. Introduce a formal data contract for Supabase tables and status values.
2. Split product content from product pricing/configuration, then move at least the content layer out of source code.
3. Add shared schema validation for API inputs and outputs.
4. Add a small service/admin surface for updating order and bid statuses.
5. Refactor duplicated line-item rendering and description logic into shared helpers.
6. Replace `middleware.ts` with the current Next.js `proxy` approach.
