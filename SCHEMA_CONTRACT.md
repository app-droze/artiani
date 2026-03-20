# Schema Contract

This file documents:

- the current live Supabase contract reconstructed on 2026-03-20 from the configured project
- the repo-added catalogue taxonomy extension introduced in migrations on 2026-03-21

Live-contract findings and repo-added schema changes are separated below.

The live-contract portion was reconstructed from:

- current app code in [`web/`](/Users/giorgimargiani/Projects/artiani/web)
- live Supabase table samples queried through the configured service-role project
- live Supabase Data API OpenAPI metadata queried with the configured secret key
- existing repo SQL in [`supabase/artist_media_cards.sql`](/Users/giorgimargiani/Projects/artiani/supabase/artist_media_cards.sql)

It is conservative by design. Anything not directly confirmed is marked uncertain.

## Required Tables

The app currently depends on these public-schema tables:

- `products`
- `product_translations`
- `product_variants`
- `product_images`
- `orders`
- `order_items`
- `artist_media_cards`

## Repo-Added Catalogue Taxonomy Extension

Added in repo migrations on 2026-03-21:

- `catalogue_categories`
- `catalogue_category_translations`
- `catalogue_collections`
- `catalogue_collection_translations`
- new nullable product columns:
  - `products.category_id`
  - `products.subtype_code`
  - `products.collection_id`

Notes:

- These objects are now part of the repo migration contract.
- They were not part of the previously reconstructed live contract.
- Current app code prefers them when available and falls back to legacy `product_type` behavior when they are missing.
- `products.product_type` remains in place for backward compatibility.

Seeded top-level category slugs in repo migrations:

- `works`
- `tablecloth`
- `table_runner`
- `headscarf`
- `pillow`
- `bag`
- `other`

Seeded translations are provided for `ka`, `en`, and `ru`, including both `name` and `description`.

## Repo-Added Shared Background Extension

Added in repo migrations on 2026-03-21:

- `catalogue_backgrounds`
- new nullable variant column:
  - `product_variants.background_id`

Notes:

- These objects are now part of the repo migration contract.
- They were added to make product backgrounds canonical and reusable across variants.
- `product_variants.background_name` remains in place for backward compatibility and fallback.
- Current app code prefers the canonical background object when available and falls back to `background_name` when `background_id` or `catalogue_backgrounds` is missing.

Seeded background codes in repo migrations:

- `white`
- `ornaments`
- `golden`
- `sky`
- `lilac`
- `h_orange`
- `forest_green`
- `navy`
- `antique_bordeaux`
- `purple`
- `antique_olive`

## Repo-Added Shared Material Extension

Added in repo migrations on 2026-03-21:

- `catalogue_materials`
- `catalogue_material_translations`
- new nullable variant column:
  - `product_variants.material_id`

Notes:

- These objects are now part of the repo migration contract.
- They were added to make variant materials canonical and localized.
- `product_variants.material` remains in place for backward compatibility and fallback.
- Current app code prefers the canonical translated material name when available and falls back to `material` when `material_id` or the material tables are missing.

Seeded material codes in repo migrations:

- `canvas`
- `velvet`
- `artificial_silk`

## Required Columns By Code

### `products`

Required by code:

- `id`
- `slug`
- `product_type`
- `is_active`
- `sort_order`

Present live but not currently used by app code:

- `is_featured`
- `created_at`
- `updated_at`

Added in repo migrations but not yet used by app code:

- `category_id`
- `subtype_code`
- `collection_id`

Notes:

- App behavior assumes `slug` can be used as a stable product URL key.
- Live uniqueness of `slug` was not directly confirmed from available metadata.
- `product_type` remains the live/app-facing classifier for now.
- `category_id`, `subtype_code`, and `collection_id` are repo-added taxonomy fields intended for the next catalogue-model iteration.

### `product_translations`

Required by code:

- `product_id`
- `lang`
- `title`
- `subtitle`
- `description`
- `material_description`
- `care_info`

Present live but not currently used by app code:

- `id`
- `created_at`
- `updated_at`

Notes:

- App behavior assumes at most one translation row per `(product_id, lang)`.
- Live uniqueness on `(product_id, lang)` was not directly confirmed from available metadata.

### `product_variants`

Required by code:

- `id`
- `product_id`
- `variant_name`
- `background_name`
- `ornament_name`
- `size_label`
- `material`
- `price`
- `stock_status`
- `is_default`
- `sort_order`
- `width_cm`
- `height_cm`
- `print_width_cm`
- `print_height_cm`

Present live but not currently used by app code:

- `sku`
- `created_at`
- `updated_at`

Added in repo migrations and used by app when available:

- `background_id`
- `material_id`

Notes:

- App code reads `width_cm`, `height_cm`, `print_width_cm`, and `print_height_cm` in print-area logic.
- App code now prefers `background_id -> catalogue_backgrounds` for PDP swatches when available, while keeping `background_name` as a compatibility fallback.
- App code now prefers `material_id -> catalogue_materials` plus localized `catalogue_material_translations.name` for PDP material display when available, while keeping `material` as a compatibility fallback.
- App behavior assumes one product variant may be the default, but that is not enforced in app code.
- Live uniqueness of `sku` was not directly confirmed from available metadata.

### `product_images`

Required by code:

- `id`
- `variant_id`
- `image_type`
- `storage_path`
- `sort_order`

Present live but not currently used directly by app code:

- `product_id`
- `created_at`

Notes:

- Live enum values confirmed for `image_type`: `main`, `detail`, `lifestyle`, `flat`.
- Current live rows sampled only used `main` and `flat`.
- App image ordering depends on `image_type` priority, then `sort_order`.

### `orders`

Required by code:

- `id`
- `order_code`
- `customer_name`
- `email`
- `phone`
- `address`
- `note`
- `status`
- `total_amount`
- `currency`
- `lang`
- `created_at`

Present live but not currently used directly by app code:

- `updated_at`

Notes:

- App currently writes `status = 'awaiting_payment'` on creation.
- App-supported status values in UI/code are: `pending`, `paid`, `processing`, `shipped`, `completed`, `cancelled`, `awaiting_payment`.
- Live enum values confirmed for `status` match those app-supported values.
- App behavior assumes `order_code` is unique for safe lookup/retry, but the exact live unique constraint was not directly confirmed.
- Current live rows included both short `ART-XXXXXX` codes and older long `ART-YYYYMMDD-XXXXXX` codes.

### `order_items`

Required by code:

- `order_id`
- `product_id`
- `variant_id`
- `qty`
- `unit_price`
- `line_total`
- `snapshot_title`
- `snapshot_variant`

Present live but not currently used directly by app code:

- `id`
- `created_at`

Notes:

- App uses `snapshot_title` and `snapshot_variant` as fallbacks during order lookup.

### `artist_media_cards`

Required by code:

- `id`
- `title`
- `type`
- `url`
- `thumbnail_path`
- `excerpt`
- `published_at`
- `lang`
- `sort_order`
- `external_source`
- `open_mode`
- `is_published`

Present live but not currently used directly by app code:

- `created_at`
- `updated_at`

Notes:

- Homepage UI currently ignores `open_mode` and always opens cards in a new tab.
- Existing repo SQL confirmed checks and the public read policy for published rows.

## Public Readability / RLS Findings

Confirmed with the current publishable key:

- Publicly readable: `products`, `product_translations`, `product_variants`, `product_images`, `artist_media_cards`
- Not publicly readable: `orders`, `order_items`

Fully confirmed policy objects:

- `artist_media_cards`: policy `"public can read published media cards"` from existing repo SQL

Uncertain:

- Exact live RLS/grant mechanism for catalogue tables (`products`, `product_translations`, `product_variants`, `product_images`)
- Exact live RLS/grant mechanism for write/read restrictions on `orders` and `order_items`

Those objects were not visible through the available metadata endpoints.

## Confirmed DB Objects

Confirmed exactly from available SQL / live metadata:

- primary keys on all 7 active tables
- foreign keys:
  - `product_translations.product_id -> products.id`
  - `product_variants.product_id -> products.id`
  - `product_images.product_id -> products.id`
  - `product_images.variant_id -> product_variants.id`
  - `order_items.order_id -> orders.id`
  - `order_items.product_id -> products.id`
  - `order_items.variant_id -> product_variants.id`
- `artist_media_cards` check constraints:
  - `artist_media_cards_type_check`
  - `artist_media_cards_lang_check`
  - `artist_media_cards_open_mode_check`
- `artist_media_cards` index:
  - `artist_media_cards_home_idx` on `(is_published, lang, sort_order, published_at desc)`
- `artist_media_cards` RLS enabled
- `artist_media_cards` policy:
  - `"public can read published media cards"` for `select` to `anon` using `(is_published = true)`

Not confirmed exactly:

- any non-PK unique constraint
- any non-`artist_media_cards` non-PK index
- any trigger or trigger-backed `updated_at` automation
- any exact RLS/grant SQL for catalogue tables, `orders`, or `order_items`

## Repo-Added DB Objects

Added intentionally in repo migrations on 2026-03-21:

- `catalogue_categories`
  - `id uuid primary key default gen_random_uuid()`
  - `slug text not null unique`
  - `sort_order integer not null default 0`
  - `is_active boolean not null default true`
  - `created_at timestamptz not null default now()`
  - `updated_at timestamptz not null default now()`
- `catalogue_category_translations`
  - `id uuid primary key default gen_random_uuid()`
  - `category_id uuid not null references public.catalogue_categories(id)`
  - `lang public.lang_code not null`
  - `name text not null`
  - `description text`
  - `created_at timestamptz not null default now()`
  - `updated_at timestamptz not null default now()`
  - unique `(category_id, lang)`
- `catalogue_collections`
  - `id uuid primary key default gen_random_uuid()`
  - `slug text not null unique`
  - `sort_order integer not null default 0`
  - `is_active boolean not null default true`
  - `created_at timestamptz not null default now()`
  - `updated_at timestamptz not null default now()`
- `catalogue_collection_translations`
  - `id uuid primary key default gen_random_uuid()`
  - `collection_id uuid not null references public.catalogue_collections(id)`
  - `lang public.lang_code not null`
  - `name text not null`
  - `description text`
  - `created_at timestamptz not null default now()`
  - `updated_at timestamptz not null default now()`
  - unique `(collection_id, lang)`
- `products` additions
  - `category_id uuid references public.catalogue_categories(id)`
  - `subtype_code text`
  - `collection_id uuid references public.catalogue_collections(id)`
- indexes
  - `products_category_id_idx` on `products(category_id)`
  - `products_collection_id_idx` on `products(collection_id)`

Repo-added seed content:

- category rows for `works`, `tablecloth`, `table_runner`, `headscarf`, `pillow`, `bag`, `other`
- localized `ka/en/ru` category `name` and `description` rows for each seeded category

These are repo-introduced schema objects, not live-reconstructed objects from 2026-03-20.

## Types Confirmed Live

Confirmed enum types from live OpenAPI metadata:

- `public.lang_code`: `ka`, `en`, `ru`
- `public.order_status`: `pending`, `paid`, `processing`, `shipped`, `completed`, `cancelled`, `awaiting_payment`
- `public.stock_status`: `in_stock`, `preorder`, `out_of_stock`
- `public.image_type`: `main`, `detail`, `lifestyle`, `flat`
- `public.product_type`: `tablecloth_square`, `tablecloth_round`, `pillow`, `table_runner`, `scarf`, `notebook`, `tshirt`, `phone_case`, `handbag`

## Uncertainties

Not fully reconstructable from available live metadata / SQL evidence:

- non-PK unique constraints
- non-`artist_media_cards` non-PK indexes
- triggers/functions, including any automatic `updated_at` maintenance
- exact catalogue-table RLS policies or grants
- exact orders/order_items RLS policies or grants
- any additional live DB objects outside the exposed Data API surface

These were intentionally not guessed in migrations.

## Live Objects Not Used By Current App

Confirmed live but not currently used by app code:

- `products.is_featured`
- `product_variants.sku`
- `product_type` enum members: `notebook`, `tshirt`, `phone_case`, `handbag`
- `artist_media_cards.open_mode` is stored but not acted on by the homepage UI

## Repo Taxonomy Objects Not Yet Used By Current App

- `catalogue_categories`
- `catalogue_category_translations`
- `catalogue_collections`
- `catalogue_collection_translations`
- `products.category_id`
- `products.subtype_code`
- `products.collection_id`
- `catalogue_backgrounds`
- `product_variants.background_id`
- `catalogue_materials`
- `catalogue_material_translations`
- `product_variants.material_id`

These were added to support the approved catalogue/taxonomy model and canonical PDP background swatches while preserving backward compatibility.

## Repo Notes

Migration files added under [`supabase/migrations/`](/Users/giorgimargiani/Projects/artiani/supabase/migrations) recreate only the confirmed contract.

They do **not** drop or rename anything automatically.

Additional repo migrations dated 2026-03-21 extend that contract with the approved catalogue taxonomy model while preserving backward compatibility for current app code.
